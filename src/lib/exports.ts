import * as XLSX from "xlsx";
import * as XLSXStyled from "xlsx-js-style";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PDFDocument } from "pdf-lib";
import { supabase } from "@/integrations/supabase/client";
import type {
  Movimiento,
  FondoConfig,
  Reembolso,
  TarifaRetencionRenta,
  ConceptoRetencionRenta,
  ConceptoReteicaDB,
  TarifaReteicaCiudad,
} from "./db";
import { computeAsiento, folioRecibo } from "./db";
import { fmtDate, fmtMoney, numeroALetras, pad } from "./format";

function finalizarPDF(doc: jsPDF, filename: string, accion: "descargar" | "imprimir" = "descargar") {
  if (accion === "imprimir") {
    const blobUrl = doc.output("bloburl") as unknown as string;
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = blobUrl;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        // Si el navegador bloquea la impresión embebida, abrimos el PDF en
        // una pestaña nueva como respaldo (el usuario puede imprimir desde ahí).
        window.open(blobUrl, "_blank");
      }
    };
    // Limpiamos el iframe un rato después, cuando ya se disparó el diálogo de impresión.
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 60_000);
  } else {
    doc.save(filename);
  }
}

export function exportReembolsoPDF(
  reembolso: Reembolso,
  movs: Movimiento[],
  fondo: FondoConfig,
  accion: "descargar" | "imprimir" = "descargar",
  totalGastosFondo?: number,
) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Reporte de Reembolso de Caja Menor", 105, 18, { align: "center" });

  const gastosFondo = reembolso.total_gastos_momento ?? totalGastosFondo ?? reembolso.total;
  const montoFondo = reembolso.monto_fondo_momento ?? Number(fondo.monto_asignado);
  const saldoDisponible = montoFondo - gastosFondo;
  doc.setFontSize(10);
  doc.setFillColor(240, 244, 250);
  doc.rect(14, 32, 182, 16, "F");
  doc.setFont("helvetica", "bold");
  doc.text("Monto fondo", 20, 38);
  doc.text("Total gastos", 82, 38);
  doc.text("Total disponible", 144, 38);
  doc.setFont("helvetica", "normal");
  doc.text(fmtMoney(montoFondo), 20, 44);
  doc.text(fmtMoney(gastosFondo), 82, 44);
  doc.text(fmtMoney(saldoDisponible), 144, 44);

  doc.setFontSize(10);
  const y0 = 56;
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
      folioRecibo(m),
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

  finalizarPDF(doc, `reporte-reembolso-caja-menor-${pad(reembolso.consecutivo)}.pdf`, accion);
}

// Agrupa en una sola fila todas las líneas de una cuenta específica (ej. la
// cuenta de reposición del fondo), sumando el total de débito y crédito, en
// vez de repetirla una vez por cada gasto — así el reporte queda listo para
// subir a un programa contable sin duplicar esa cuenta.
// Exporta la contabilización de un reembolso en el formato EXACTO que pide
// el programa contable de la empresa (16 columnas fijas). Por cada gasto:
// una fila de débito por el valor base (y por IVA/impoconsumo si aplica),
// y una fila de crédito por cada retención si aplica. Al final, UNA sola
// fila de crédito consolidada a la cuenta de reposición (24109503) por el
// total del reembolso, identificada con el responsable del fondo.
export function exportContabilizacionExcel(
  reembolso: Reembolso,
  movs: Movimiento[],
  fondo: FondoConfig,
  tarifas?: TarifaRetencionRenta[],
  conceptosReteica?: ConceptoReteicaDB[],
  tarifasReteicaCiudad?: TarifaReteicaCiudad[],
  conceptosRetencionRenta?: ConceptoRetencionRenta[],
) {
  const ENCABEZADOS = [
    "Identificacion", "Agencia", "Documento referencia", "Descripcion transaccion",
    "Fecha documento", "Fecha contabilidad", "Consecutivo movimiento", "Descripcion mvto",
    "Codigo comprobante", "Cuenta contable", "Codigo Centro de Costo", "Monto debito",
    "Monto credito", "Base retencion", "Esquema", "Replicar NIIF",
  ];

  const filas: (string | number)[][] = [];

  movs.forEach((m) => {
    const { debitos, creditos } = computeAsiento(m, fondo, tarifas, conceptosReteica, tarifasReteicaCiudad, conceptosRetencionRenta);
    // La última "credito" que arma computeAsiento siempre es la de "Caja
    // menor" (contrapartida) por el total del gasto — esa NO va aquí,
    // porque la reemplazamos por la fila consolidada a 24109503 al final.
    const creditosSinCajaMenor = creditos.filter((c) => c.descripcion !== "Caja menor");

    const nit = m.proveedores?.nit ?? "";

    debitos.forEach((d) => {
      filas.push([
        nit,
        m.agencias?.codigo ?? "",
        folioRecibo(m),
        m.detalle ?? "",
        fmtDate(m.fecha),
        fmtDate(m.fecha),
        1,
        m.detalle ?? "",
        "013",
        d.cuenta,
        "",
        d.valor,
        0,
        "",
        "02",
        "NO ",
      ]);
    });
    creditosSinCajaMenor.forEach((c) => {
      filas.push([
        nit,
        m.agencias?.codigo ?? "",
        folioRecibo(m),
        m.detalle ?? "",
        fmtDate(m.fecha),
        fmtDate(m.fecha),
        1,
        m.detalle ?? "",
        "013",
        c.cuenta,
        "",
        0,
        c.valor,
        "",
        "02",
        "NO ",
      ]);
    });
  });

  // Fila(s) consolidada(s) de reposición del fondo: una por cada fondo
  // específico involucrado (una agencia puede tener más de uno), usando la
  // identificación del responsable de ESE fondo. Si el movimiento no tiene
  // un fondo específico asignado, se usa el responsable general de
  // Configuración como respaldo.
  const gruposPorFondo = new Map<string, { total: number; agenciaCodigo: string | number; identificacion: string }>();
  movs.forEach((m) => {
    const clave = m.fondo_agencia_id ?? "__general__";
    const identificacion =
      m.fondos_agencia?.identificacion_responsable || fondo.identificacion_responsable || "";
    const actual = gruposPorFondo.get(clave) ?? {
      total: 0,
      agenciaCodigo: m.agencias?.codigo ?? "",
      identificacion,
    };
    actual.total += Number(m.total);
    gruposPorFondo.set(clave, actual);
  });
  gruposPorFondo.forEach((grupo) => {
    filas.push([
      grupo.identificacion,
      grupo.agenciaCodigo,
      grupo.identificacion,
      "Reposición fondo caja menor",
      fmtDate(reembolso.fecha),
      fmtDate(reembolso.fecha),
      1,
      "Reposición fondo caja menor",
      "013",
      "24109503",
      "",
      0,
      grupo.total,
      "",
      "02",
      "NO ",
    ]);
  });

  const aoa = [ENCABEZADOS, ...filas];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 14 }, { wch: 9 }, { wch: 16 }, { wch: 26 }, { wch: 13 }, { wch: 13 },
    { wch: 10 }, { wch: 26 }, { wch: 12 }, { wch: 13 }, { wch: 10 }, { wch: 13 },
    { wch: 13 }, { wch: 12 }, { wch: 9 }, { wch: 12 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Contabilizacion");
  XLSX.writeFile(wb, `contabilizacion-reembolso-${pad(reembolso.consecutivo)}.xlsx`);
}

function consolidarCuenta(
  filas: (string | number)[][],
  cuenta: string,
  descripcion: string,
): (string | number)[][] {
  const resto: (string | number)[][] = [];
  let totalDebito = 0;
  let totalCredito = 0;
  filas.forEach((fila) => {
    if (fila[2] === cuenta) {
      totalDebito += Number(fila[4]) || 0;
      totalCredito += Number(fila[5]) || 0;
    } else {
      resto.push(fila);
    }
  });
  if (totalDebito > 0) resto.push(["", "", cuenta, descripcion, totalDebito, 0]);
  if (totalCredito > 0) resto.push(["", "", cuenta, descripcion, 0, totalCredito]);
  return resto;
}

export function exportReembolsoExcel(
  reembolso: Reembolso,
  movs: Movimiento[],
  fondo: FondoConfig,
  tarifas?: TarifaRetencionRenta[],
  conceptosReteica?: ConceptoReteicaDB[],
  tarifasReteicaCiudad?: TarifaReteicaCiudad[],
  totalGastosFondo?: number,
) {
  const wb = XLSXStyled.utils.book_new();
  const FORMATO_MONEDA = '"$"#,##0';
  const AZUL = "1E3A5F";
  const GRIS = "E8EAED";
  const BLANCO = "FFFFFF";
  const marcarMoneda = (ws: XLSXStyled.WorkSheet, celdas: string[]) => {
    celdas.forEach((addr) => {
      if (ws[addr]) ws[addr].z = FORMATO_MONEDA;
    });
  };
  const estiloTitulo = { font: { bold: true, sz: 13, color: { rgb: BLANCO } }, fill: { fgColor: { rgb: AZUL } }, alignment: { horizontal: "center" as const, vertical: "center" as const } };
  const estiloEncabezado = { font: { bold: true, color: { rgb: AZUL } }, fill: { fgColor: { rgb: GRIS } } };
  const aplicarEstiloFila = (ws: XLSXStyled.WorkSheet, fila: number, estilo: object, cols: number) => {
    for (let c = 0; c < cols; c++) {
      const addr = XLSXStyled.utils.encode_cell({ r: fila, c });
      if (ws[addr]) ws[addr].s = estilo;
    }
  };

  const gastosFondo = reembolso.total_gastos_momento ?? totalGastosFondo ?? reembolso.total;
  const montoFondo = reembolso.monto_fondo_momento ?? Number(fondo.monto_asignado);
  const saldoDisponible = montoFondo - gastosFondo;

  // Hoja 1: Resumen del reporte
  const resumen: (string | number)[][] = [
    ["REPORTE DE REEMBOLSO DE CAJA MENOR"],
    [],
    ["Monto fondo", montoFondo],
    ["Total gastos", gastosFondo],
    ["Total disponible", saldoDisponible],
    [],
    ["Empresa", fondo.empresa],
    ["Responsable", fondo.responsable],
    ["Fecha de solicitud", fmtDate(reembolso.fecha)],
    ["Periodo", `${fmtDate(reembolso.periodo_inicio)} — ${fmtDate(reembolso.periodo_fin)}`],
    ["Estado", reembolso.estado],
    ["Cantidad de movimientos", movs.length],
    ["Total a reembolsar", reembolso.total],
    [],
    ["Elaborado por", fondo.responsable],
    ["Autorizado por", fondo.nombre_aprobador],
  ];
  const wsR = XLSXStyled.utils.aoa_to_sheet(resumen);
  wsR["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  wsR["!cols"] = [{ wch: 26 }, { wch: 28 }];
  aplicarEstiloFila(wsR, 0, estiloTitulo, 2);
  ["A3", "A4", "A5", "A7", "A8", "A9", "A10", "A11", "A12", "A13", "A15", "A16"].forEach((addr) => {
    if (wsR[addr]) wsR[addr].s = { font: { bold: true } };
  });
  marcarMoneda(wsR, ["B3", "B4", "B5", "B13"]);
  XLSXStyled.utils.book_append_sheet(wb, wsR, "Resumen");

  // Hoja 2: Relación de gastos incluidos en esta solicitud (debe coincidir 1 a 1
  // con los movimientos que forman parte del reembolso).
  const rows = movs.map((m) => ({
    "Recibo N°": folioRecibo(m),
    Fecha: fmtDate(m.fecha),
    Agencia: m.agencias?.nombre ?? "",
    Proveedor: m.proveedores?.nombre ?? "",
    NIT: m.proveedores?.nit ?? "",
    Concepto: m.conceptos?.nombre ?? "",
    "Cuenta gasto": m.conceptos?.cuenta_gasto ?? "",
    Detalle: m.detalle ?? "",
    Factura: m.numero_factura ?? "",
    "Factura electrónica": m.factura_electronica ? "Sí" : "No",
    Subtotal: Number(m.subtotal),
    IVA: Number(m.iva),
    Impoconsumo: Number(m.impoconsumo),
    "Rete Fuente": Number(m.retencion),
    ReteICA: Number(m.reteica),
    ReteIVA: Number(m.reteiva),
    Total: Number(m.total),
  }));
  const wsG = XLSXStyled.utils.json_to_sheet(rows);
  wsG["!cols"] = [
    { wch: 10 }, { wch: 11 }, { wch: 16 }, { wch: 26 }, { wch: 14 }, { wch: 20 },
    { wch: 12 }, { wch: 26 }, { wch: 12 }, { wch: 10 }, { wch: 13 }, { wch: 11 },
    { wch: 13 }, { wch: 12 }, { wch: 11 }, { wch: 11 }, { wch: 13 },
  ];
  aplicarEstiloFila(wsG, 0, estiloEncabezado, 17);
  for (let i = 0; i < rows.length; i++) {
    marcarMoneda(wsG, ["K", "L", "M", "N", "O", "P", "Q"].map((c) => `${c}${i + 2}`));
  }
  XLSXStyled.utils.book_append_sheet(wb, wsG, "Relación de gastos");

  // Hoja 3: Arqueo de caja realizado al momento de la solicitud (si se registró).
  if (reembolso.arqueo) {
    const filas: (string | number)[][] = [["ARQUEO DE CAJA"], [], ["Denominación", "Cantidad", "Subtotal"]];
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
    const wsQ = XLSXStyled.utils.aoa_to_sheet(filas);
    wsQ["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
    wsQ["!cols"] = [{ wch: 30 }, { wch: 12 }, { wch: 16 }];
    aplicarEstiloFila(wsQ, 0, estiloTitulo, 3);
    aplicarEstiloFila(wsQ, 2, estiloEncabezado, 3);
    for (let i = 2; i < filas.length; i++) {
      marcarMoneda(wsQ, [`C${i + 1}`]);
    }
    XLSXStyled.utils.book_append_sheet(wb, wsQ, "Arqueo de caja");
  }

  XLSXStyled.writeFile(wb, `reporte-reembolso-caja-menor-${pad(reembolso.consecutivo)}.xlsx`);
}

export function exportExcel(
  movs: Movimiento[],
  fondo: FondoConfig,
) {
  const rows = movs.map((m) => ({
    "Recibo N°": folioRecibo(m),
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

  XLSX.writeFile(wb, `caja-menor-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// Reporte de asientos contables (débito/crédito) de un conjunto de
// movimientos, filtrable por fecha y por rango de recibo desde Contabilidad.
export function exportAsientosContablesExcel(
  movs: Movimiento[],
  fondo: FondoConfig,
  tarifas?: TarifaRetencionRenta[],
  conceptosReteica?: ConceptoReteicaDB[],
  tarifasReteicaCiudad?: TarifaReteicaCiudad[],
  conceptosRetencionRenta?: ConceptoRetencionRenta[],
) {
  const asientos: (string | number)[][] = [
    ["Recibo", "Fecha", "Cuenta", "Descripción", "Débito", "Crédito"],
  ];
  [...movs]
    .sort((a, b) => a.consecutivo - b.consecutivo)
    .forEach((m) => {
      const { debitos, creditos } = computeAsiento(m, fondo, tarifas, conceptosReteica, tarifasReteicaCiudad, conceptosRetencionRenta);
      debitos.forEach((d) =>
        asientos.push([folioRecibo(m), fmtDate(m.fecha), d.cuenta, d.descripcion, d.valor, 0]),
      );
      creditos.forEach((c) =>
        asientos.push([folioRecibo(m), fmtDate(m.fecha), c.cuenta, c.descripcion, 0, c.valor]),
      );
    });

  const totalDebito = asientos.slice(1).reduce((s, r) => s + Number(r[4] || 0), 0);
  const totalCredito = asientos.slice(1).reduce((s, r) => s + Number(r[5] || 0), 0);
  asientos.push(["", "", "", "TOTALES", totalDebito, totalCredito]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(asientos);
  XLSX.utils.book_append_sheet(wb, ws, "Asientos contables");
  XLSX.writeFile(wb, `asientos-contables-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// Reporte de saldo del fondo + relación detallada de los gastos que aún no
// se han reembolsado, con las columnas puntuales que se necesitan para dar
// seguimiento rápido: fecha, recibo, identificación y nombre del proveedor,
// concepto, factura y valor pagado.
export function exportSaldoPendientesPDF(
  movsPendientes: Movimiento[],
  fondo: FondoConfig,
  accion: "descargar" | "imprimir" = "descargar",
) {
  const doc = new jsPDF({ orientation: "landscape" });
  const totalGastos = movsPendientes.reduce((s, m) => s + Number(m.total), 0);
  const saldoActual = Number(fondo.monto_asignado) - totalGastos;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Reporte de Saldo y Gastos Pendientes por Reembolsar", 148, 14, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Fecha del reporte: ${fmtDate(new Date())}`, 230, 20, { align: "right" });

  autoTable(doc, {
    startY: 24,
    head: [["Monto del fondo", "Monto de gastos pendientes", "Saldo actual"]],
    body: [[fmtMoney(fondo.monto_asignado), fmtMoney(totalGastos), fmtMoney(saldoActual)]],
    styles: { fontSize: 10, halign: "center" },
    headStyles: { fillColor: [0, 105, 92], halign: "center" },
  });

  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8,
    head: [["Fecha", "N° Recibo", "NIT/Identif. proveedor", "Nombre proveedor", "Concepto", "N° Factura", "Valor pagado"]],
    body: [...movsPendientes]
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.consecutivo - b.consecutivo)
      .map((m) => [
        fmtDate(m.fecha),
        folioRecibo(m),
        m.proveedores?.nit ?? "",
        m.proveedores?.nombre ?? "",
        m.conceptos?.nombre ?? "",
        m.numero_factura ?? "",
        fmtMoney(m.total),
      ]),
    foot: [["", "", "", "", "", "TOTAL PENDIENTE", fmtMoney(totalGastos)]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 50, 90] },
    footStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: "bold" },
  });

  finalizarPDF(doc, `saldo-y-pendientes-${new Date().toISOString().slice(0, 10)}.pdf`, accion);
}

// Misma información que exportSaldoPendientesPDF ("Reporte actual CM"), pero
// en Excel — todo en una sola hoja, con un diseño más claro.
export function exportSaldoPendientesExcel(movsPendientes: Movimiento[], fondo: FondoConfig) {
  const totalGastos = movsPendientes.reduce((s, m) => s + Number(m.total), 0);
  const saldoActual = Number(fondo.monto_asignado) - totalGastos;
  const filas = [...movsPendientes].sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || a.consecutivo - b.consecutivo,
  );

  const headerRow = 9; // fila (1-indexada) donde va el encabezado de la tabla
  const aoa: (string | number)[][] = [
    ["REPORTE DE SALDO Y GASTOS PENDIENTES POR REEMBOLSAR"],
    [`Fecha del reporte: ${fmtDate(new Date())}`],
    [],
    ["Monto del fondo", "Monto de gastos pendientes", "Saldo actual"],
    [Number(fondo.monto_asignado), totalGastos, saldoActual],
    [],
    [`Gastos pendientes por reembolsar (${filas.length})`],
    [],
    ["Fecha", "N° Recibo", "NIT/Identif. proveedor", "Nombre proveedor", "Concepto", "N° Factura", "Valor pagado"],
    ...filas.map((m) => [
      fmtDate(m.fecha),
      folioRecibo(m),
      m.proveedores?.nit ?? "",
      m.proveedores?.nombre ?? "",
      m.conceptos?.nombre ?? "",
      m.numero_factura ?? "",
      Number(m.total),
    ]),
    ["", "", "", "", "", "TOTAL PENDIENTE", totalGastos],
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Título y bloque de resumen ocupando varias columnas.
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    { s: { r: 6, c: 0 }, e: { r: 6, c: 6 } },
  ];
  ws["!cols"] = [
    { wch: 12 },
    { wch: 12 },
    { wch: 20 },
    { wch: 32 },
    { wch: 24 },
    { wch: 14 },
    { wch: 16 },
  ];

  // Formato de moneda para los valores numéricos (fondo/gastos/saldo y la
  // columna de valor pagado, incluida la fila de total).
  const celdasMoneda = [
    "A5", "B5", "C5",
    ...filas.map((_, i) => `G${headerRow + 1 + i}`),
    `G${headerRow + filas.length + 1}`,
  ];
  celdasMoneda.forEach((addr) => {
    if (ws[addr]) ws[addr].z = '"$"#,##0';
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Saldo y pendientes");
  XLSX.writeFile(wb, `saldo-y-pendientes-${new Date().toISOString().slice(0, 10)}.xlsx`);
}


export function exportPDF(
  movs: Movimiento[],
  fondo: FondoConfig,
  accion: "descargar" | "imprimir" = "descargar",
  tarifas?: TarifaRetencionRenta[],
  conceptosReteica?: ConceptoReteicaDB[],
  tarifasReteicaCiudad?: TarifaReteicaCiudad[],
  conceptosRetencionRenta?: ConceptoRetencionRenta[],
) {
  const doc = new jsPDF({ orientation: "landscape" });
  const total = movs.reduce((s, m) => s + Number(m.total), 0);
  const saldo = Number(fondo.monto_asignado) - total;

  const ordenados = [...movs].sort((a, b) => a.consecutivo - b.consecutivo);
  const rcmDel =
    ordenados.length > 0
      ? `${pad(ordenados[0].consecutivo)} - ${pad(ordenados[ordenados.length - 1].consecutivo)}`
      : "—";
  const fechas = movs.map((m) => m.fecha).sort();
  const fechaDesde = fechas.length > 0 ? fmtDate(fechas[0]) : "—";
  const fechaHasta = fechas.length > 0 ? fmtDate(fechas[fechas.length - 1]) : "—";
  const agenciasUnicas = new Set(movs.map((m) => m.agencias?.nombre ?? "—"));
  const agenciaTexto = agenciasUnicas.size === 1 ? [...agenciasUnicas][0] : "Varias";

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("FORMATO LIBRO DE CAJA MENOR", 148, 14, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Fecha del reporte: ${fmtDate(new Date())}`, 230, 20, { align: "right" });

  autoTable(doc, {
    startY: 24,
    head: [
      [
        "NOMBRE",
        "RCM DEL",
        "FECHA DESDE",
        "HASTA",
        "FONDO CAJA MENOR",
        "TOTAL EN RECIBOS DE CAJA",
        "VR SALDO DISPONIBLE",
        "AGENCIA",
      ],
    ],
    body: [
      [
        fondo.responsable,
        rcmDel,
        fechaDesde,
        fechaHasta,
        fmtMoney(fondo.monto_asignado),
        fmtMoney(total),
        fmtMoney(saldo),
        agenciaTexto,
      ],
    ],
    styles: { fontSize: 8, halign: "center" },
    headStyles: { fillColor: [0, 105, 92], halign: "center" },
  });

  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6,
    head: [["Recibo", "Fecha", "Proveedor", "Concepto", "Factura", "F.E.", "Subtotal", "IVA", "Rte.Fte", "RteICA", "RteIVA", "Total"]],
    body: movs.map((m) => [
      folioRecibo(m),
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
    const { debitos, creditos } = computeAsiento(m, fondo, tarifas, conceptosReteica, tarifasReteicaCiudad, conceptosRetencionRenta);
    debitos.forEach((d) =>
      asientosBody.push([folioRecibo(m), d.cuenta, d.descripcion, fmtMoney(d.valor), ""]),
    );
    creditos.forEach((c) =>
      asientosBody.push([folioRecibo(m), c.cuenta, c.descripcion, "", fmtMoney(c.valor)]),
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
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [215.9, 139.7] });
  const fecha = new Date(mov.fecha + "T00:00:00");
  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const anio = String(fecha.getFullYear()).slice(-2);
  const cancelado = mov.reembolsos?.estado === "pagado";

  // Marco general del recibo (imita el formato físico) — ajustado a media carta.
  const x0 = 8, y0 = 8, w = 199.9, h = 123.7;
  const TEAL: [number, number, number] = [0, 105, 92];
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.4);
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
  doc.setTextColor(...TEAL);
  doc.text("RECIBO DE CAJA MENOR", x0 + w / 2 + 10, y0 + 12, { align: "center" });
  doc.setTextColor(200, 0, 0);
  doc.setFontSize(14);
  doc.text(`N° ${folioRecibo(mov)}`, x0 + w - 6, y0 + 20, { align: "right" });
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  doc.line(x0 + 2, y0 + 24, x0 + w - 2, y0 + 24);

  // Monto principal
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEAL);
  doc.text("Valor pagado", x0 + 8, y0 + 30);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(fmtMoney(mov.total), x0 + 8, y0 + 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `Empresa: ${fondo.empresa}${fondo.nit_empresa ? " · NIT " + fondo.nit_empresa : ""}`,
    x0 + w - 6,
    y0 + 32,
    { align: "right" },
  );
  doc.text(`Agencia: ${mov.agencias?.nombre ?? "—"}`, x0 + w - 6, y0 + 37, { align: "right" });
  doc.setFontSize(8);
  doc.text("Forma de pago: Efectivo (Caja menor)", x0 + w - 6, y0 + 41, { align: "right" });

  // Pagado a / Por concepto de / Valor en letras
  let y = y0 + 46;
  doc.setFontSize(10);
  doc.setTextColor(...TEAL);
  doc.text("Pagado a:", x0 + 6, y);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text(
    `${mov.proveedores?.nombre ?? ""}  ·  NIT ${mov.proveedores?.nit ?? ""}`,
    x0 + 32,
    y,
  );
  doc.setFont("helvetica", "normal");
  doc.line(x0 + 2, y + 2, x0 + w - 2, y + 2);

  y += 12;
  doc.setTextColor(...TEAL);
  doc.text("Por concepto de:", x0 + 6, y);
  doc.setTextColor(0, 0, 0);
  const conceptoTexto = `${mov.conceptos?.nombre ?? ""}${mov.detalle ? " — " + mov.detalle : ""}`;
  const lineasConcepto = doc.splitTextToSize(conceptoTexto, w - 42);
  doc.text(lineasConcepto, x0 + 40, y);
  doc.line(x0 + 2, y + 8, x0 + w - 2, y + 8);

  y += 18;
  doc.setTextColor(...TEAL);
  doc.text("Valor (en letras):", x0 + 6, y);
  doc.setTextColor(0, 0, 0);
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
  doc.setTextColor(...TEAL);
  doc.text("APROBADO", x0 + colW / 2, yF + 15, { align: "center" });
  doc.text("ELABORADO", x0 + colW + colW / 2, yF + 15, { align: "center" });
  doc.text("Firma de recibido", x0 + colW * 2 + colW / 2, yF + 15, { align: "center" });
  doc.setTextColor(0, 0, 0);
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

  // Sello de "ANULADO" si el movimiento fue anulado. El recibo se conserva
  // imprimible (con su mismo N° consecutivo) para no romper la numeración.
  if (mov.estado === "anulado") {
    doc.setFontSize(26);
    doc.setTextColor(200, 0, 0);
    doc.text("ANULADO", x0 + w / 2, y0 + h / 2 + (cancelado ? 14 : 0), {
      align: "center",
      angle: 18,
    });
    doc.setTextColor(0, 0, 0);
  }

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
  finalizarPDF(doc, `recibo-${folioRecibo(mov)}.pdf`, accion);
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
            page.drawText(`Soporte — Recibo N° ${folioRecibo(mov)}`, {
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
