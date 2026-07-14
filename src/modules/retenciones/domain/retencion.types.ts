export interface RetencionRecord {
    // Shared
    razonSocial: string;

    // Retención sheet fields
    ruc: string;
    fechaEmisionRetencion: any;
    serie: string;
    secuencia: string;
    autorizacion: string;
    baseRenta: number;
    porcenRenta: number;
    valorRenta: number;
    baseIva: number;
    porcenIva: number;
    valorIva: number;

    // Ventas sheet fields
    numeroFactura: string;
    fechaEmisionFactura: any;
    subtotal: number | null;
    tarifaCero: number | null;
    iva: number | null;
    total: number;
}
