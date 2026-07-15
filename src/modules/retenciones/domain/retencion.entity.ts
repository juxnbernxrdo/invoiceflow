import { RetencionRecord } from './retencion.types';

export class Retencion implements RetencionRecord {
    public razonSocial: string;
    public ruc: string;
    public fechaEmisionRetencion: any;
    public serie: string;
    public secuencia: string;
    public autorizacion: string;
    public baseRenta: number;
    public porcenRenta: number;
    public valorRenta: number;
    public baseIva: number;
    public porcenIva: number;
    public valorIva: number;

    public codDoc: string;
    public numeroFactura: string;
    public fechaEmisionFactura: any;
    public subtotal: number | null;
    public tarifaCero: number | null;
    public iva: number | null;
    public total: number;

    constructor(data: RetencionRecord) {
        this.razonSocial = data.razonSocial || 'SIN NOMBRE';
        this.ruc = data.ruc || '';
        this.fechaEmisionRetencion = data.fechaEmisionRetencion;
        this.serie = data.serie || '';
        this.secuencia = data.secuencia || '';
        this.autorizacion = data.autorizacion || '';
        this.baseRenta = data.baseRenta;
        this.porcenRenta = data.porcenRenta;
        this.valorRenta = data.valorRenta;
        this.baseIva = data.baseIva;
        this.porcenIva = data.porcenIva;
        this.valorIva = data.valorIva;

        this.codDoc = data.codDoc || '';
        this.numeroFactura = data.numeroFactura || '';
        this.fechaEmisionFactura = data.fechaEmisionFactura;
        this.subtotal = data.subtotal;
        this.tarifaCero = data.tarifaCero;
        this.iva = data.iva;
        this.total = data.total;
    }

    public validate(): void {
        if (!this.razonSocial.trim()) {
            throw new Error('La razón social no puede estar vacía.');
        }
        // Only require numeroFactura when there IS an associated invoice document.
        // codDoc '00' means retención directa sin factura asociada (e.g., retenciones bancarias).
        if (this.codDoc !== '00' && !this.numeroFactura.trim()) {
            throw new Error('El número de factura no puede estar vacío para documentos tipo ' + this.codDoc + '.');
        }
    }
}
