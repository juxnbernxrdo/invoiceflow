import { Retencion } from '../domain/retencion.entity';
import { debugLog, isDebugEnabled } from '../../../utils/logger';

export class ExcelRetencionMapper {
    private static getVal(row: any, idx: number): any {
        return idx > 0 ? row.getCell(idx).value : null;
    }

    private static getNum(row: any, idx: number): number {
        if (idx <= 0) return 0;
        const val = row.getCell(idx).value;
        return val !== null && val !== undefined ? Number(val) : 0;
    }

    private static excelSerialToDate(serial: any): Date | any {
        if (serial === null || serial === undefined) return null;
        if (typeof serial !== 'number') {
            if (serial instanceof Date) return serial;
            if (typeof serial === 'string') {
                const parsed = Date.parse(serial);
                if (!isNaN(parsed)) return new Date(parsed);
            }
            return serial;
        }
        const days = serial - (serial > 60 ? 25569 : 25568);
        return new Date(Math.round(days * 86400 * 1000));
    }

    public static mapRowToEntity(row: any, colIdxs: any): Retencion {
        if (isDebugEnabled()) {
            const rowNumber = row.number || '?';
            debugLog({ stage: 'MAP_ROW', row: rowNumber }, 'Mapping row to entity');
        }

        const rSoc = this.getVal(row, colIdxs.razonsocial);
        const rucVal = this.getVal(row, colIdxs.rucemisor);
        const fEmiRet = this.excelSerialToDate(this.getVal(row, colIdxs.fechaemi));
        
        const numEstab = this.getVal(row, colIdxs.numestab);
        const ptoEmi = this.getVal(row, colIdxs.ptoemi);
        const serie = numEstab || ptoEmi ? `${numEstab ? String(numEstab).trim() : ''}-${ptoEmi ? String(ptoEmi).trim() : ''}` : '';
        
        const secVal = this.getVal(row, colIdxs.secuencial);
        const autVal = this.getVal(row, colIdxs.numautori);

        const baseRenta = this.getNum(row, colIdxs.ftebase1);
        const porcenRenta = this.getNum(row, colIdxs.fteporcen1);
        const valorRenta = this.getNum(row, colIdxs.ftevalret1);

        const baseIva = this.getNum(row, colIdxs.ivabase1);
        const porcenIva = this.getNum(row, colIdxs.ivaporcen1);
        const valorIva = this.getNum(row, colIdxs.ivavalret1);

        // Ventas support invoice fields
        const nFact = this.getVal(row, colIdxs.sussecuenc);
        const fEmiFact = this.excelSerialToDate(this.getVal(row, colIdxs.susfecemi));
        const codDocVal = this.getVal(row, colIdxs.coddocum);
        const codDoc = codDocVal ? String(codDocVal).trim() : '';

        let subtotal: number | null = null;
        let tarifaCero: number | null = null;

        if (baseIva > 0 || codDoc === '20') {
            subtotal = baseRenta;
            tarifaCero = null;
        } else {
            subtotal = null;
            tarifaCero = baseRenta;
        }

        const iva = baseIva > 0 ? baseIva : 0;
        const total = (subtotal || tarifaCero || 0) + iva;

        const retencion = new Retencion({
            razonSocial: rSoc ? String(rSoc).trim() : '',
            ruc: rucVal ? String(rucVal).trim() : '',
            fechaEmisionRetencion: fEmiRet,
            serie,
            secuencia: secVal ? String(secVal).trim() : '',
            autorizacion: autVal ? String(autVal).trim() : '',
            baseRenta,
            porcenRenta,
            valorRenta,
            baseIva,
            porcenIva,
            valorIva,
            codDoc,
            numeroFactura: nFact ? String(nFact).trim() : '',
            fechaEmisionFactura: fEmiFact,
            subtotal,
            tarifaCero,
            iva,
            total
        });

        retencion.validate();
        return retencion;
    }
}
