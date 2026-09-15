// Los extractos N43 y muchos CSV de bancos españoles vienen en Latin-1, no en UTF-8: si decodificar
// como UTF-8 deja caracteres de reemplazo, se reintenta como ISO-8859-1.
export function decodeBankFile(buf: ArrayBuffer): string {
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buf)
  if (!utf8.includes('�')) return utf8.charCodeAt(0) === 0xfeff ? utf8.slice(1) : utf8
  return new TextDecoder('iso-8859-1').decode(buf)
}
