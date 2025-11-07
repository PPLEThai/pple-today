/**
 * **NOTE:** Assuming that `tel` has `+66\d{9}` format.
 */
export const telFormatter = (tel: string) => {
  const digits = tel.match(/\+66(\d{2})(\d{3})(\d{4})/)
  if (!digits) return tel
  return `0${digits[1]}-${digits[2]}-${digits[3]}`
}
