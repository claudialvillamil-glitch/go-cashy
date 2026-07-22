import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Movimiento, FondoConfig, Reembolso } from "./db";
import { computeAsiento } from "./db";
import { fmtDate, fmtMoney, pad } from "./format";

export function exportReembolsoPDF(reembolso: Reembolso, movs: Movimiento[], fondo: FondoConfig) {
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
    head: [["Recibo", "Fecha", "Proveedor", "Concepto", "Factura", "Subtotal", "IVA", "Retención", "Total"]],
    body: movs.map((m) => [
      pad(m.consecutivo),
      fmtDate(m.fecha),
      m.proveedores?.nombre ?? "",
      m.conceptos?.nombre ?? "",
      m.numero_factura ?? "",
      fmtMoney(m.subtotal),
      fmtMoney(m.iva),
      fmtMoney(m.retencion),
      fmtMoney(m.total),
    ]),
    foot: [["", "", "", "", "", "", "", "TOTAL", fmtMoney(reembolso.total)]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 50, 90] },
    footStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: "bold" },
  });

  if (reembolso.observaciones) {
    const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    doc.setFontSize(9);
    doc.text(`Observaciones: ${reembolso.observaciones}`, 14, y);
  }

  const yFirma =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 30;
  doc.line(20, yFirma, 90, yFirma);
  doc.line(120, yFirma, 190, yFirma);
  doc.setFontSize(9);
  doc.text("Solicitado por", 55, yFirma + 5, { align: "center" });
  doc.text("Aprobado por", 155, yFirma + 5, { align: "center" });

  doc.save(`reembolso-${pad(reembolso.consecutivo)}.pdf`);
}

export function exportExcel(movs: Movimiento[], fondo: FondoConfig) {
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
    Subtotal: m.subtotal,
    IVA: m.iva,
    Impoconsumo: m.impoconsumo,
    Retención: m.retencion,
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
    const { debitos, creditos } = computeAsiento(m);
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

export function exportPDF(movs: Movimiento[], fondo: FondoConfig) {
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
    head: [["Recibo", "Fecha", "Proveedor", "Concepto", "Factura", "Subtotal", "IVA", "Retención", "Total"]],
    body: movs.map((m) => [
      pad(m.consecutivo),
      fmtDate(m.fecha),
      m.proveedores?.nombre ?? "",
      m.conceptos?.nombre ?? "",
      m.numero_factura ?? "",
      fmtMoney(m.subtotal),
      fmtMoney(m.iva),
      fmtMoney(m.retencion),
      fmtMoney(m.total),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 50, 90] },
  });

  // Asientos
  const asientosBody: (string | number)[][] = [];
  movs.forEach((m) => {
    const { debitos, creditos } = computeAsiento(m);
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

  doc.save(`caja-menor-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportReciboPDF(mov: Movimiento, fondo: FondoConfig) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Recibo de Caja Menor", 105, 18, { align: "center" });
  doc.setFontSize(11);
  doc.text(`N° ${pad(mov.consecutivo)}`, 105, 26, { align: "center" });

  doc.setFontSize(10);
  const y0 = 40;
  doc.text(`Empresa: ${fondo.empresa}`, 14, y0);
  doc.text(`Agencia: ${mov.agencias?.nombre ?? ""}`, 14, y0 + 6);
  doc.text(`Fecha: ${fmtDate(mov.fecha)}`, 14, y0 + 12);
  doc.text(`Responsable: ${fondo.responsable}`, 130, y0);

  doc.text(`Proveedor: ${mov.proveedores?.nombre ?? ""}`, 14, y0 + 24);
  doc.text(`NIT: ${mov.proveedores?.nit ?? ""}`, 14, y0 + 30);
  doc.text(`Concepto: ${mov.conceptos?.nombre ?? ""}`, 14, y0 + 36);
  doc.text(`Factura: ${mov.numero_factura ?? "—"}`, 14, y0 + 42);
  doc.text(`Detalle: ${mov.detalle ?? ""}`, 14, y0 + 48);

  autoTable(doc, {
    startY: y0 + 56,
    head: [["Concepto", "Valor"]],
    body: [
      ["Subtotal", fmtMoney(mov.subtotal)],
      ["IVA", fmtMoney(mov.iva)],
      ["Impoconsumo", fmtMoney(mov.impoconsumo)],
      ["Retención", `- ${fmtMoney(mov.retencion)}`],
      ["Total pagado", fmtMoney(mov.total)],
    ],
    headStyles: { fillColor: [30, 50, 90] },
  });

  const { debitos, creditos } = computeAsiento(mov);
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

  const y3 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 25;
  doc.line(20, y3, 90, y3);
  doc.line(120, y3, 190, y3);
  doc.setFontSize(9);
  doc.text("Responsable del fondo", 55, y3 + 5, { align: "center" });
  doc.text("Autorizado por", 155, y3 + 5, { align: "center" });

  doc.save(`recibo-${pad(mov.consecutivo)}.pdf`);
}
