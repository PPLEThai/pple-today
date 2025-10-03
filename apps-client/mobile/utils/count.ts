export function renderCount(count: number) {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + ' ล้าน'
  }

  if (count >= 100000) {
    return (count / 100000).toFixed(1) + ' แสน'
  }

  if (count >= 10000) {
    return (count / 10000).toFixed(1) + ' หมื่น'
  }

  if (count >= 1000) {
    return (count / 1000).toFixed(1) + ' พัน'
  }
  return count.toString()
}
