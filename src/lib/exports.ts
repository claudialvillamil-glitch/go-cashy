import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PDFDocument } from "pdf-lib";
import { supabase } from "@/integrations/supabase/client";
import type {
  Movimiento,
  FondoConfig,
  Reembolso,
  TarifaRetencionRenta,
  ConceptoReteicaDB,
  TarifaReteicaCiudad,
} from "./db";
import { computeAsiento, computeAsientoReposicion } from "./db";
import { fmtDate, fmtMoney, numeroALetras, pad } from "./format";

function finalizarPDF(doc: jsPDF, filename: string, accion: "descargar" | "imprimir" = "descargar") {
  if (accion === "imprimir") {
    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
  } else {
    doc.save(filename);
  }
}

export function exportReembolsoPDF(
  reembolso: Reembolso,
  movs: Movimiento[],
  fondo: FondoConfig,
  accion: "descargar" | "imprimir" = "descargar",
) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Solicitud de Reembolso · Caja Menor", 105, 18, { align: "center" });
  doc.setFontSize(11);
  doc.text(`N° ${pad(reembolso.consecutivo)}`, 105, 26, { align: "center" });

  doc.setFontSize(10);
  const y0 = 38;
  doc.text(`Empresa: ${fondo.empresa}`, 14, y0);
  doc.text(`Responsable: ${fondo.responsable}`, 14, y0 + 6);
  doc.text(`Fecha solicitud: ${fmtDate(reembolso.fecha)}`, 14, y0 + 12);
  doc.text(
    `Periodo: ${fmtDate(reembolso.periodo_inicio)} — ${fmtDate(reembolso.periodo_fin)}`,
    14,
    y0 + 18,
  );
  doc.text(`Estado: ${reembolso.estado.toUpperCase()}`, 130, y0);
  doc.text(`Movimientos: ${movs.length}`, 130, y0 + 6);
  doc.text(`Total: ${fmtMoney(reembolso.total)}`, 130, y0 + 12);

  autoTable(doc, {
    startY: y0 + 26,
    head: [["Recibo", "Fecha", "Proveedor", "Concepto", "Factura", "F.E.", "Subtotal", "IVA", "Rte.Fte", "RteICA", "RteIVA", "Total"]],
    body: movs.map((m) => [
      pad(m.consecutivo),
      fmtDate(m.fecha),
      m.proveedores?.nombre ?? "",
      m.conceptos?.nombre ?? "",
      m.numero_factura ?? "",
      m.factura_electronica ? "Sí" : "No",
      fmtMoney(m.subtotal),
      fmtMoney(m.iva),
      fmtMoney(m.retencion),
      fmtMoney(m.reteica),
      fmtMoney(m.reteiva),
      fmtMoney(m.total),
    ]),
    foot: [["", "", "", "", "", "", "", "", "", "", "TOTAL", fmtMoney(reembolso.total)]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 50, 90] },
    footStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: "bold" },
  });

  if (reembolso.observaciones) {
    const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    doc.setFontSize(9);
    doc.text(`Observaciones: ${reembolso.observaciones}`, 14, y);
  }

  if (reembolso.estado === "pagado") {
    const { debitos, creditos } = computeAsientoReposicion(movs, fondo);
    const yA = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
    doc.setFontSize(11);
    doc.text("Asiento de reposición del fondo", 14, yA);
    autoTable(doc, {
      startY: yA + 4,
      head: [["Cuenta", "Descripción", "Débito", "Crédito"]],
      body: [
        ...debitos.map((d) => [d.cuenta, d.descripcion, fmtMoney(d.valor), ""]),
        ...creditos.map((c) => [c.cuenta, c.descripcion, "", fmtMoney(c.valor)]),
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 50, 90] },
    });
  }

  if (reembolso.arqueo) {
    const yQ = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
    doc.setFontSize(11);
    doc.text(
      `Arqueo de caja${reembolso.arqueo.esCierreMes ? " (cierre de mes)" : ""}`,
      14,
      yQ,
    );
    autoTable(doc, {
      startY: yQ + 4,
      head: [["Denominación", "Cantidad", "Subtotal"]],
      body: Object.entries(reembolso.arqueo.cantidades).map(([valor, cant]) => [
        fmtMoney(Number(valor)),
        String(cant),
        fmtMoney(Number(valor) * Number(cant)),
      ]),
      foot: [
        ["Total contado", "", fmtMoney(reembolso.arqueo.totalContado)],
        ["Saldo teórico", "", fmtMoney(reembolso.arqueo.saldoTeorico)],
        [
          reembolso.arqueo.diferencia === 0
            ? "Cuadra"
            : reembolso.arqueo.diferencia > 0
              ? "Sobante"
              : "Faltante",
          "",
          fmtMoney(Math.abs(reembolso.arqueo.diferencia)),
        ],
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 50, 90] },
      footStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: "bold" },
    });

    if (reembolso.arqueo.provisionales && reembolso.arqueo.provisionales.length > 0) {
      const yP = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
      doc.setFontSize(9);
      doc.text("Recibos provisionales (sin legalizar al momento del arqueo)", 14, yP);
      autoTable(doc, {
        startY: yP + 4,
        head: [["Tercero", "Concepto", "Monto"]],
        body: reembolso.arqueo.provisionales.map((p) => [p.tercero, p.concepto, fmtMoney(p.monto)]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 50, 90] },
      });
    }
  }

  const yFirma =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 30;
  doc.line(20, yFirma, 90, yFirma);
  doc.line(120, yFirma, 190, yFirma);
  doc.setFontSize(9);
  doc.text(fondo.responsable || "", 55, yFirma + 5, { align: "center" });
  doc.text(fondo.nombre_aprobador || "", 155, yFirma + 5, { align: "center" });
  doc.setFontSize(8);
  doc.text("Elaborado por", 55, yFirma + 10, { align: "center" });
  doc.text("Autorizado por", 155, yFirma + 10, { align: "center" });

  finalizarPDF(doc, `reembolso-${pad(reembolso.consecutivo)}.pdf`, accion);
}

export function exportReembolsoExcel(
  reembolso: Reembolso,
  movs: Movimiento[],
  fondo: FondoConfig,
  tarifas?: TarifaRetencionRenta[],
  conceptosReteica?: ConceptoReteicaDB[],
  tarifasReteicaCiudad?: TarifaReteicaCiudad[],
) {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Resumen de la solicitud
  const resumen = [
    ["Solicitud de reembolso N°", pad(reembolso.consecutivo)],
    ["Empresa", fondo.empresa],
    ["Responsable", fondo.responsable],
    ["Fecha de solicitud", fmtDate(reembolso.fecha)],
    ["Periodo", `${fmtDate(reembolso.periodo_inicio)} — ${fmtDate(reembolso.periodo_fin)}`],
    ["Estado", reembolso.estado],
    ["Cantidad de movimientos", movs.length],
    ["Total a reembolsar", reembolso.total],
    ["", ""],
    ["Elaborado por", fondo.responsable],
    ["Autorizado por", fondo.nombre_aprobador],
  ];
  const wsR = XLSX.utils.aoa_to_sheet(resumen);
  XLSX.utils.book_append_sheet(wb, wsR, "Resumen");

  // Hoja 2: Relación de gastos incluidos en esta solicitud (debe coincidir 1 a 1
  // con los movimientos que forman parte del reembolso).
  const rows = movs.map((m) => ({
    "Recibo N°": pad(m.consecutivo),
    Fecha: fmtDate(m.fecha),
    Agencia: m.agencias?.nombre ?? "",
    Proveedor: m.proveedores?.nombre ?? "",
    NIT: m.proveedores?.nit ?? "",
    Concepto: m.conceptos?.nombre ?? "",
    "Cuenta gasto": m.conceptos?.cuenta_gasto ?? "",
    Detalle: m.detalle ?? "",
    Factura: m.numero_factura ?? "",
    "Factura electrónica": m.factura_electronica ? "Sí" : "No",
    Subtotal: m.subtotal,
    IVA: m.iva,
    Impoconsumo: m.impoconsumo,
    "Rete Fuente": m.retencion,
    ReteICA: m.reteica,
    ReteIVA: m.reteiva,
    Total: m.total,
  }));
  const wsG = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, wsG, "Relación de gastos");

  // Hoja 3: Asientos contables generados por cada gasto (débito/crédito).
  const asientos: (string | number)[][] = [
    ["Recibo", "Fecha", "Cuenta", "Descripción", "Débito", "Crédito"],
  ];
  movs.forEach((m) => {
    const { debitos, creditos } = computeAsiento(m, fondo, tarifas, conceptosReteica, tarifasReteicaCiudad);
    debitos.forEach((d) =>
      asientos.push([pad(m.consecutivo), fmtDate(m.fecha), d.cuenta, d.descripcion, d.valor, 0]),
    );
    creditos.forEach((c) =>
      asientos.push([pad(m.consecutivo), fmtDate(m.fecha), c.cuenta, c.descripcion, 0, c.valor]),
    );
  });

  // Si ya está pagado, se agrega también el asiento de reposición del fondo,
  // que es el que efectivamente se pasa al programa contable de la empresa.
  if (reembolso.estado === "pagado") {
    asientos.push(["", "", "", "", "", ""]);
    asientos.push(["", "", "REPOSICIÓN DEL FONDO", "", "", ""]);
    const { debitos, creditos } = computeAsientoReposicion(movs, fondo);
    debitos.forEach((d) =>
      asientos.push([pad(reembolso.consecutivo), fmtDate(reembolso.fecha), d.cuenta, d.descripcion, d.valor, 0]),
    );
    creditos.forEach((c) =>
      asientos.push([pad(reembolso.consecutivo), fmtDate(reembolso.fecha), c.cuenta, c.descripcion, 0, c.valor]),
    );
  }

  const wsA = XLSX.utils.aoa_to_sheet(asientos);
  XLSX.utils.book_append_sheet(wb, wsA, "Asientos contables");

  // Hoja 4: Arqueo de caja realizado al momento de la solicitud (si se registró).
  if (reembolso.arqueo) {
    const filas: (string | number)[][] = [["Denominación", "Cantidad", "Subtotal"]];
    Object.entries(reembolso.arqueo.cantidades).forEach(([valor, cant]) => {
      filas.push([Number(valor), Number(cant), Number(valor) * Number(cant)]);
    });
    if (reembolso.arqueo.provisionales && reembolso.arqueo.provisionales.length > 0) {
      filas.push(["", "", ""]);
      filas.push(["RECIBOS PROVISIONALES (sin legalizar)", "", ""]);
      filas.push(["Tercero", "Concepto", "Monto"]);
      reembolso.arqueo.provisionales.forEach((p) => {
        filas.push([p.tercero, p.concepto, p.monto]);
      });
    }
    filas.push(["", "", ""]);
    filas.push(["Total contado", "", reembolso.arqueo.totalContado]);
    filas.push(["Saldo teórico", "", reembolso.arqueo.saldoTeorico]);
    filas.push([
      reembolso.arqueo.diferencia === 0
        ? "Cuadra"
        : reembolso.arqueo.diferencia > 0
          ? "Sobante"
          : "Faltante",
      "",
      Math.abs(reembolso.arqueo.diferencia),
    ]);
    const wsQ = XLSX.utils.aoa_to_sheet(filas);
    XLSX.utils.book_append_sheet(wb, wsQ, "Arqueo de caja");
  }

  XLSX.writeFile(wb, `contabilidad-reembolso-${pad(reembolso.consecutivo)}.xlsx`);
}

export function exportExcel(
  movs: Movimiento[],
  fondo: FondoConfig,
  tarifas?: TarifaRetencionRenta[],
  conceptosReteica?: ConceptoReteicaDB[],
  tarifasReteicaCiudad?: TarifaReteicaCiudad[],
) {
  const rows = movs.map((m) => ({
    "Recibo N°": pad(m.consecutivo),
    Fecha: fmtDate(m.fecha),
    Agencia: m.agencias?.nombre ?? "",
    Proveedor: m.proveedores?.nombre ?? "",
    NIT: m.proveedores?.nit ?? "",
    Concepto: m.conceptos?.nombre ?? "",
    "Cuenta gasto": m.conceptos?.cuenta_gasto ?? "",
    Detalle: m.detalle ?? "",
    Factura: m.numero_factura ?? "",
    "Factura electrónica": m.factura_electronica ? "Sí" : "No",
    Subtotal: m.subtotal,
    IVA: m.iva,
    Impoconsumo: m.impoconsumo,
    "Rete Fuente": m.retencion,
    ReteICA: m.reteica,
    ReteIVA: m.reteiva,
    Total: m.total,
    Estado: m.estado,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Movimientos");

  const total = movs.reduce((s, m) => s + Number(m.total), 0);
  const resumen = [
    ["Empresa", fondo.empresa],
    ["Responsable", fondo.responsable],
    ["Monto asignado", fondo.monto_asignado],
    ["Total gastos", total],
    ["Saldo disponible", Number(fondo.monto_asignado) - total],
    ["Cantidad movimientos", movs.length],
  ];
  const wsR = XLSX.utils.aoa_to_sheet(resumen);
  XLSX.utils.book_append_sheet(wb, wsR, "Resumen");

  // Asientos
  const asientos: (string | number)[][] = [
    ["Recibo", "Fecha", "Cuenta", "Descripción", "Débito", "Crédito"],
  ];
  movs.forEach((m) => {
    const { debitos, creditos } = computeAsiento(m, fondo, tarifas, conceptosReteica, tarifasReteicaCiudad);
    debitos.forEach((d) =>
      asientos.push([pad(m.consecutivo), fmtDate(m.fecha), d.cuenta, d.descripcion, d.valor, 0]),
    );
    creditos.forEach((c) =>
      asientos.push([pad(m.consecutivo), fmtDate(m.fecha), c.cuenta, c.descripcion, 0, c.valor]),
    );
  });
  const wsA = XLSX.utils.aoa_to_sheet(asientos);
  XLSX.utils.book_append_sheet(wb, wsA, "Asientos contables");

  XLSX.writeFile(wb, `caja-menor-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportPDF(
  movs: Movimiento[],
  fondo: FondoConfig,
  accion: "descargar" | "imprimir" = "descargar",
  tarifas?: TarifaRetencionRenta[],
  conceptosReteica?: ConceptoReteicaDB[],
  tarifasReteicaCiudad?: TarifaReteicaCiudad[],
) {
  const doc = new jsPDF({ orientation: "landscape" });
  const total = movs.reduce((s, m) => s + Number(m.total), 0);
  const saldo = Number(fondo.monto_asignado) - total;

  doc.setFontSize(16);
  doc.text("Reporte de Caja Menor", 14, 15);
  doc.setFontSize(10);
  doc.text(`Empresa: ${fondo.empresa}`, 14, 22);
  doc.text(`Responsable: ${fondo.responsable}`, 14, 27);
  doc.text(`Fecha del reporte: ${fmtDate(new Date())}`, 14, 32);

  doc.setFontSize(11);
  doc.text(`Monto asignado: ${fmtMoney(fondo.monto_asignado)}`, 150, 22);
  doc.text(`Total gastos: ${fmtMoney(total)}`, 150, 27);
  doc.text(`Saldo disponible: ${fmtMoney(saldo)}`, 150, 32);

  autoTable(doc, {
    startY: 40,
    head: [["Recibo", "Fecha", "Proveedor", "Concepto", "Factura", "F.E.", "Subtotal", "IVA", "Rte.Fte", "RteICA", "RteIVA", "Total"]],
    body: movs.map((m) => [
      pad(m.consecutivo),
      fmtDate(m.fecha),
      m.proveedores?.nombre ?? "",
      m.conceptos?.nombre ?? "",
      m.numero_factura ?? "",
      m.factura_electronica ? "Sí" : "No",
      fmtMoney(m.subtotal),
      fmtMoney(m.iva),
      fmtMoney(m.retencion),
      fmtMoney(m.reteica),
      fmtMoney(m.reteiva),
      fmtMoney(m.total),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 50, 90] },
  });

  // Asientos
  const asientosBody: (string | number)[][] = [];
  movs.forEach((m) => {
    const { debitos, creditos } = computeAsiento(m, fondo, tarifas, conceptosReteica, tarifasReteicaCiudad);
    debitos.forEach((d) =>
      asientosBody.push([pad(m.consecutivo), d.cuenta, d.descripcion, fmtMoney(d.valor), ""]),
    );
    creditos.forEach((c) =>
      asientosBody.push([pad(m.consecutivo), c.cuenta, c.descripcion, "", fmtMoney(c.valor)]),
    );
  });

  doc.addPage();
  doc.setFontSize(14);
  doc.text("Asientos contables generados", 14, 15);
  autoTable(doc, {
    startY: 22,
    head: [["Recibo", "Cuenta", "Descripción", "Débito", "Crédito"]],
    body: asientosBody,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 50, 90] },
  });

  finalizarPDF(doc, `caja-menor-${new Date().toISOString().slice(0, 10)}.pdf`, accion);
}

function buildReciboDoc(
  mov: Movimiento,
  fondo: FondoConfig,
  tarifas?: TarifaRetencionRenta[],
  conceptosReteica?: ConceptoReteicaDB[],
  tarifasReteicaCiudad?: TarifaReteicaCiudad[],
): jsPDF {
  const doc = new jsPDF();
  const fecha = new Date(mov.fecha + "T00:00:00");
  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const anio = String(fecha.getFullYear()).slice(-2);
  const cancelado = mov.reembolsos?.estado === "pagado";

  // Marco general del recibo (imita el formato físico)
  const x0 = 14, y0 = 14, w = 182, h = 130;
  doc.setDrawColor(60, 60, 60);
  doc.roundedRect(x0, y0, w, h, 3, 3);

  // Casillas Día / Mes / Año
  doc.setFontSize(7);
  doc.text("DÍA", x0 + 8, y0 + 8, { align: "center" });
  doc.text("MES", x0 + 20, y0 + 8, { align: "center" });
  doc.text("AÑO", x0 + 32, y0 + 8, { align: "center" });
  doc.rect(x0 + 4, y0 + 10, 10, 8);
  doc.rect(x0 + 16, y0 + 10, 10, 8);
  doc.rect(x0 + 28, y0 + 10, 10, 8);
  doc.setFontSize(10);
  doc.text(dia, x0 + 9, y0 + 15.5, { align: "center" });
  doc.text(mes, x0 + 21, y0 + 15.5, { align: "center" });
  doc.text(anio, x0 + 33, y0 + 15.5, { align: "center" });

  // Título y número de recibo
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("RECIBO DE CAJA MENOR", x0 + w / 2 + 10, y0 + 12, { align: "center" });
  doc.setTextColor(200, 0, 0);
  doc.setFontSize(14);
  doc.text(`N° ${pad(mov.consecutivo)}`, x0 + w - 6, y0 + 20, { align: "right" });
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  doc.line(x0 + 2, y0 + 24, x0 + w - 2, y0 + 24);

  // Monto principal
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(fmtMoney(mov.total), x0 + 8, y0 + 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Empresa: ${fondo.empresa}`, x0 + w - 6, y0 + 32, { align: "right" });
  doc.text(`Agencia: ${mov.agencias?.nombre ?? "—"}`, x0 + w - 6, y0 + 37, { align: "right" });

  // Pagado a / Por concepto de / Valor en letras
  let y = y0 + 46;
  doc.setFontSize(10);
  doc.text("Pagado a:", x0 + 6, y);
  doc.setFont("helvetica", "bold");
  doc.text(
    `${mov.proveedores?.nombre ?? ""}  ·  NIT ${mov.proveedores?.nit ?? ""}`,
    x0 + 32,
    y,
  );
  doc.setFont("helvetica", "normal");
  doc.line(x0 + 2, y + 2, x0 + w - 2, y + 2);

  y += 12;
  doc.text("Por concepto de:", x0 + 6, y);
  const conceptoTexto = `${mov.conceptos?.nombre ?? ""}${mov.detalle ? " — " + mov.detalle : ""}`;
  const lineasConcepto = doc.splitTextToSize(conceptoTexto, w - 42);
  doc.text(lineasConcepto, x0 + 40, y);
  doc.line(x0 + 2, y + 8, x0 + w - 2, y + 8);

  y += 18;
  doc.text("Valor (en letras):", x0 + 6, y);
  const enLetras = doc.splitTextToSize(numeroALetras(mov.total), w - 46);
  doc.text(enLetras, x0 + 42, y);
  doc.line(x0 + 2, y + 10, x0 + w - 2, y + 10);

  // Firmas: Aprobado / Elaborado / Firma de recibido
  const yF = y0 + h - 32;
  const colW = w / 3;
  doc.line(x0 + 4, yF + 10, x0 + colW - 4, yF + 10);
  doc.line(x0 + colW + 4, yF + 10, x0 + colW * 2 - 4, yF + 10);
  doc.line(x0 + colW * 2 + 4, yF + 10, x0 + w - 4, yF + 10);
  doc.setFontSize(9);
  doc.text(fondo.nombre_aprobador || "", x0 + colW / 2, yF + 8, { align: "center" });
  doc.text(fondo.responsable || "", x0 + colW + colW / 2, yF + 8, { align: "center" });
  doc.setFontSize(8);
  doc.text("APROBADO", x0 + colW / 2, yF + 15, { align: "center" });
  doc.text("ELABORADO", x0 + colW + colW / 2, yF + 15, { align: "center" });
  doc.text("Firma de recibido", x0 + colW * 2 + colW / 2, yF + 15, { align: "center" });
  doc.text(
    `C.C. o NIT: ${mov.proveedores?.nit ?? ""}`,
    x0 + colW * 2 + colW / 2,
    yF + 20,
    { align: "center" },
  );

  // Pie: código / vigencia / versión del formato
  if (fondo.codigo_recibo || fondo.vigencia_recibo || fondo.version_recibo) {
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    let yPie = y0 + h - 12;
    if (fondo.codigo_recibo) {
      doc.text(`CÓDIGO: ${fondo.codigo_recibo}`, x0 + 4, yPie);
      yPie += 3.5;
    }
    if (fondo.vigencia_recibo) {
      doc.text(`VIGENCIA: ${fondo.vigencia_recibo}`, x0 + 4, yPie);
      yPie += 3.5;
    }
    if (fondo.version_recibo) {
      doc.text(`VERSIÓN: ${fondo.version_recibo}`, x0 + 4, yPie);
    }
    doc.setTextColor(0, 0, 0);
  }

  // Sello de "CANCELADO" si el gasto ya fue reembolsado (pagado)
  if (cancelado) {
    doc.setFontSize(22);
    doc.setTextColor(200, 0, 0);
    doc.text("CANCELADO", x0 + w / 2, y0 + h / 2, {
      align: "center",
      angle: 18,
    });
    doc.setTextColor(0, 0, 0);
  }

  // Detalle contable (uso interno, no forma parte del formato físico)
  const yDet = y0 + h + 10;
  doc.setFontSize(12);
  doc.text("Detalle contable", 14, yDet);

  if (mov.multi_soporte && mov.movimiento_items && mov.movimiento_items.length > 0) {
    const its = [...mov.movimiento_items].sort((a, b) => a.orden - b.orden);
    autoTable(doc, {
      startY: yDet + 4,
      head: [["#", "Proveedor", "Concepto", "Factura", "F.E.", "Subtotal", "IVA", "Impoc.", "Rt.Fte", "RtICA", "RtIVA", "Total"]],
      body: its.map((it, i) => [
        String(i + 1),
        it.proveedores?.nombre ?? "",
        it.conceptos?.nombre ?? "",
        it.numero_factura ?? "",
        it.factura_electronica ? "Sí" : "No",
        fmtMoney(it.subtotal),
        fmtMoney(it.iva),
        fmtMoney(it.impoconsumo),
        fmtMoney(it.retencion),
        fmtMoney(it.reteica),
        fmtMoney(it.reteiva),
        fmtMoney(it.total),
      ]),
      foot: [["", "", "", "", "", "", "", "", "", "", "TOTAL", fmtMoney(mov.total)]],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 50, 90] },
      footStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: "bold" },
    });
  } else {
    autoTable(doc, {
      startY: yDet + 4,
      head: [["Concepto", "Valor"]],
      body: [
        ["Subtotal", fmtMoney(mov.subtotal)],
        ["IVA", fmtMoney(mov.iva)],
        ["Impoconsumo", fmtMoney(mov.impoconsumo)],
        ["Retención en la fuente", `- ${fmtMoney(mov.retencion)}`],
        ["ReteICA", `- ${fmtMoney(mov.reteica)}`],
        ["ReteIVA", `- ${fmtMoney(mov.reteiva)}`],
        ["Total pagado", fmtMoney(mov.total)],
      ],
      headStyles: { fillColor: [30, 50, 90] },
    });

    const filasRetenciones: string[][] = [];
    if (mov.retencion > 0) {
      const t = tarifas?.find((x) => x.id === mov.tarifa_retencion_id);
      filasRetenciones.push([
        "RF",
        "Retención en la fuente",
        t ? `${Number(t.porcentaje)}%` : "—",
        fmtMoney(mov.retencion),
      ]);
    }
    if (mov.reteica > 0) {
      const t = tarifasReteicaCiudad?.find((x) => x.id === mov.tarifa_reteica_ciudad_id);
      filasRetenciones.push([
        "ICA",
        "ReteICA",
        t ? `${Number(t.tarifa)}‰` : "—",
        fmtMoney(mov.reteica),
      ]);
    }
    if (mov.reteiva > 0) {
      filasRetenciones.push(["IVA", "ReteIVA", "15%", fmtMoney(mov.reteiva)]);
    }

    if (filasRetenciones.length > 0) {
      const yRet = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.text("Retenciones practicadas", 14, yRet);
      autoTable(doc, {
        startY: yRet + 4,
        head: [["Tipo", "Descripción", "Tarifa", "Valor"]],
        body: filasRetenciones,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 50, 90] },
      });
    }
  }

  const { debitos, creditos } = computeAsiento(mov, fondo, tarifas, conceptosReteica, tarifasReteicaCiudad);
  const y2 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.text("Asiento contable", 14, y2);
  autoTable(doc, {
    startY: y2 + 4,
    head: [["Cuenta", "Descripción", "Débito", "Crédito"]],
    body: [
      ...debitos.map((d) => [d.cuenta, d.descripcion, fmtMoney(d.valor), ""]),
      ...creditos.map((c) => [c.cuenta, c.descripcion, "", fmtMoney(c.valor)]),
    ],
    headStyles: { fillColor: [30, 50, 90] },
  });

  return doc;
}

export function exportReciboPDF(
  mov: Movimiento,
  fondo: FondoConfig,
  accion: "descargar" | "imprimir" = "descargar",
  tarifas?: TarifaRetencionRenta[],
  conceptosReteica?: ConceptoReteicaDB[],
  tarifasReteicaCiudad?: TarifaReteicaCiudad[],
) {
  const doc = buildReciboDoc(mov, fondo, tarifas, conceptosReteica, tarifasReteicaCiudad);
  finalizarPDF(doc, `recibo-${pad(mov.consecutivo)}.pdf`, accion);
}

// Descarga la imagen/PDF de soporte de un movimiento como bytes crudos,
// generando un enlace firmado fresco (más confiable que uno guardado).
async function fetchSoporteBytes(factura_path: string): Promise<ArrayBuffer | null> {
  const { data, error } = await supabase.storage
    .from("facturas")
    .createSignedUrl(factura_path, 60 * 5);
  if (error || !data?.signedUrl) return null;
  const resp = await fetch(data.signedUrl);
  if (!resp.ok) return null;
  return resp.arrayBuffer();
}

// Arma un único PDF: por cada movimiento (en orden de consecutivo), la
// página del recibo seguida de su soporte adjunto (imagen o PDF escaneado).
// Si el soporte no se puede cargar, sigue con el siguiente recibo sin
// interrumpir el reporte completo.
async function buildConsolidadoPDF(
  movs: Movimiento[],
  fondo: FondoConfig,
  tarifas?: TarifaRetencionRenta[],
  conceptosReteica?: ConceptoReteicaDB[],
  tarifasReteicaCiudad?: TarifaReteicaCiudad[],
): Promise<Uint8Array> {
  const master = await PDFDocument.create();
  const ordenados = [...movs].sort((a, b) => a.consecutivo - b.consecutivo);

  for (const mov of ordenados) {
    // 1) Página del recibo
    const reciboDoc = buildReciboDoc(mov, fondo, tarifas, conceptosReteica, tarifasReteicaCiudad);
    const reciboBytes = reciboDoc.output("arraybuffer") as ArrayBuffer;
    const reciboPdf = await PDFDocument.load(reciboBytes);
    const reciboPages = await master.copyPages(reciboPdf, reciboPdf.getPageIndices());
    reciboPages.forEach((p) => master.addPage(p));

    // 2) Soporte adjunto (si existe)
    if (mov.factura_path) {
      try {
        const bytes = await fetchSoporteBytes(mov.factura_path);
        if (bytes) {
          const ext = mov.factura_path.split(".").pop()?.toLowerCase() ?? "";
          if (ext === "pdf") {
            const soportePdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
            const soportePages = await master.copyPages(soportePdf, soportePdf.getPageIndices());
            soportePages.forEach((p) => master.addPage(p));
          } else if (["jpg", "jpeg", "png"].includes(ext)) {
            const img = ext === "png" ? await master.embedPng(bytes) : await master.embedJpg(bytes);
            const pageW = 612;
            const pageH = 792;
            const page = master.addPage([pageW, pageH]);
            const maxW = pageW - 60;
            const maxH = pageH - 100;
            const scale = Math.min(maxW / img.width, maxH / img.height, 1);
            const w = img.width * scale;
            const h = img.height * scale;
            page.drawText(`Soporte — Recibo N° ${pad(mov.consecutivo)}`, {
              x: 30,
              y: pageH - 40,
              size: 12,
            });
            page.drawImage(img, {
              x: (pageW - w) / 2,
              y: (pageH - h) / 2 - 20,
              width: w,
              height: h,
            });
          }
        }
      } catch {
        // Si falla la carga del soporte, seguimos con el siguiente recibo.
      }
    }
  }

  return master.save();
}

function descargarPdfBytes(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Reporte descargable por reembolso: cada recibo incluido, seguido de su
// soporte, uno tras otro en un solo PDF.
export async function exportReembolsoConSoportesPDF(
  reembolso: Reembolso,
  movs: Movimiento[],
  fondo: FondoConfig,
  tarifas?: TarifaRetencionRenta[],
  conceptosReteica?: ConceptoReteicaDB[],
  tarifasReteicaCiudad?: TarifaReteicaCiudad[],
) {
  const bytes = await buildConsolidadoPDF(movs, fondo, tarifas, conceptosReteica, tarifasReteicaCiudad);
  descargarPdfBytes(bytes, `reembolso-${pad(reembolso.consecutivo)}-recibos-y-soportes.pdf`);
}

// Igual, pero para el libro de caja menor general (todos los movimientos
// filtrados en la pantalla de Movimientos).
export async function exportLibroCajaMenorConSoportesPDF(
  movs: Movimiento[],
  fondo: FondoConfig,
  tarifas?: TarifaRetencionRenta[],
  conceptosReteica?: ConceptoReteicaDB[],
  tarifasReteicaCiudad?: TarifaReteicaCiudad[],
) {
  const bytes = await buildConsolidadoPDF(movs, fondo, tarifas, conceptosReteica, tarifasReteicaCiudad);
  descargarPdfBytes(bytes, `libro-caja-menor-recibos-y-soportes-${new Date().toISOString().slice(0, 10)}.pdf`);
}
