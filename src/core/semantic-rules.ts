export interface TransformRules {
    deleteHeaders: string[];
    sumHeaders: string[];
    targetHeader: string;
    targetHumanNames: string[];
    replacements: { fromHeader: string; toHeader: string }[];
    fixedColumns: { header: string; value: any; position: 'after' | 'before'; refHeader: string }[];
}

// Semantic rules: 26-column input → 12-column output.
// Columns are identified by header meaning, NOT by color or position.
export const SEMANTIC_RULES: TransformRules = {
    // Columns to DELETE from output (14 columns)
    deleteHeaders: [
        'tpcomproba',     // tipo comprobante
        'numautori',      // número autorización
        'fecautori',      // fecha autorización
        'placa',          // placa vehicular
        'nro_item',       // número ítem
        'codprincipal',   // código principal producto
        'codauxiliar',    // código auxiliar producto
        'cantidad',       // cantidad
        'precio_u',       // precio unitario
        'descuento',      // descuento
        'poriva',         // porcentaje IVA
        'base0',          // base tarifa 0% (used in BASE CERO calc, then deleted)
        'valice',         // valor ICE (used in BASE CERO calc, then deleted)
        'exento',         // exento de IVA (used in BASE CERO calc, then deleted)
        'noobjiva',       // no objeto de IVA (used in BASE CERO calc, then deleted)
    ],

    // Columns summed to calculate BASE CERO (tarifa 0%)
    sumHeaders: [
        'base0',          // base tarifa 0%
        'valice',         // valor ICE
        'exento',         // exento de IVA
        'noobjiva',       // no objeto de IVA
    ],

    // irbpnr is NOT a sum column — it's a legacy column that gets deleted.
    // Its value is NOT used in the output. BASE CERO is recalculated from sumHeaders.

    // Target column that receives the sum of sumHeaders.
    // In the output this appears as "BASE CERO".
    targetHeader: 'irbpnr',
    targetHumanNames: ['base cero', 'base0'],

    // Column header replacements (technical → human-readable output header)
    replacements: [
        { fromHeader: 'idrecep', toHeader: 'ID RECEPTOR' },
        { fromHeader: 'secuenciales', toHeader: 'SECUENCIAL ' },
        { fromHeader: 'ruc_emisor', toHeader: 'RUC EMISOR' },
        { fromHeader: 'razonsocial', toHeader: 'RAZÓN SOCIAL' },
        { fromHeader: 'fechaemi', toHeader: 'FECHA EMISIÓN' },
        { fromHeader: 'claveacceso', toHeader: 'CLAVE ACCESO' },
        { fromHeader: 'descripcion', toHeader: 'DESCRIPCIÓN' },
        { fromHeader: 'baseimp', toHeader: 'BASE  IVA' },
        { fromHeader: 'valiva', toHeader: 'IVA' },
        { fromHeader: 'precio_t', toHeader: 'TOTAL' },
    ],

    // Fixed columns inserted into the output (not from input)
    // value is a placeholder — actual value comes from TransformOptions.tipoGasto
    fixedColumns: [
        { header: 'TIPO GASTO', value: '', position: 'after', refHeader: 'descripcion' },
    ],
};
