import { cn } from '@pple-today/web-ui/utils'

export const PostGallery = ({ images }: { images: string[] }) => {
  const imagesLength = images.length
  const galleryLength = Math.min(imagesLength, 4)
  const excessImages = imagesLength - galleryLength

  return imagesLength > 0 ? (
    <div className="grid gap-0.5 grid-cols-4 overflow-hidden">
      {Array(galleryLength).fill``.map((_, aidx) => (
        <a
          className={cn(
            'relative overflow-hidden',
            aidx === 0 && 'rounded-l-lg',
            aidx === galleryLength - 1 && 'rounded-r-lg'
          )}
          key={images[aidx]}
          href={images[aidx]}
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            className="w-full h-auto aspect-[4/3]"
            src={images[aidx]}
            alt=""
            loading="lazy"
            decoding="async"
          />
          {excessImages > 0 && aidx === galleryLength - 1 && (
            <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-2xl font-semibold text-white">
              +{excessImages}
            </span>
          )}
        </a>
      ))}
    </div>
  ) : null
}
