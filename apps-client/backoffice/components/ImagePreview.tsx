import { ComponentProps } from 'react'

export const ImagePreview = ({
  src,
  ...imgProps
}: { src?: File | string } & Omit<ComponentProps<'img'>, 'src'>) => {
  const source = src instanceof File ? URL.createObjectURL(src) : src

  return <img src={source} {...imgProps} />
}
