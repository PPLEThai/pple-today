import React from 'react'

export function useCountdownTimer(initialDate: Date) {
  const targetDate = initialDate.getTime()
  const [timeLeft, setTimeLeft] = React.useState(calculateTimeLeft())

  function calculateTimeLeft() {
    const now = new Date().getTime()
    const diff = targetDate - now

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 }
    }

    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
    }
  }

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const format = (num: number) => String(num).padStart(2, '0')

  return [
    format(timeLeft.days),
    format(timeLeft.hours),
    format(timeLeft.minutes),
    format(timeLeft.seconds),
  ] as const
}
