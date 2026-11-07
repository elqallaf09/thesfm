// Keep this allowlist small: settings validation must not load the calendar UI.
export const TV_SESSION_IDS = ["XKUW","XSAU","XLON","XNYS","XTKS","AIXK","ASEX","BVMF","XAMS","XASX","XBDA","XBEL","XBKK","XBOG","XBOM","XBRA","XBRU","XBSE","XBUD","XBUE","XCSE","XCYS","XDUB","XDUS","XETR","XFRA","XHAM","XHEL","XHKG","XICE","XIDX","XIST","XJSE","XKAR","XKLS","XKRX","XLIM","XLIS","XLIT","XLJU","XLUX","XMAD","XMEX","XMIL","XMOS","XNZE","XOSL","XPAR","XPHS","XPRA","XRIS","XSES","XSGO","XSHG","XSTO","XSTU","XSWX","XTAI","XTAL","XTSE","XWAR","XWBO","XZAG","XDFM","XADS","DIFX","DSMD","XBAH","XMUS","XAMM","XCAS","XTUN","XNSE","XSHE","XNAS","XASE","XTSX","NGX","XCAI","XPAE","XIQS"] as const;
export const DEFAULT_TV_SESSION_IDS = ['XKUW','XSAU','XLON','XNYS','XTKS'];
const allowed = new Set<string>(TV_SESSION_IDS);
export function normalizeTvSessionIds(value: unknown): string[] | undefined {
 return Array.isArray(value) ? [...new Set(value.filter((id):id is string=>typeof id==='string'&&allowed.has(id)))].slice(0,TV_SESSION_IDS.length) : undefined;
}
