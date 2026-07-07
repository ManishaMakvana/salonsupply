'use client';

import Image from 'next/image';
import { Package } from 'lucide-react';
import { useState } from 'react';

type LazyImageProps = {
    src: string | null | undefined;
    alt: string;
    className?: string;
    sizes?: string;
};

export function LazyImage({
    src,
    alt,
    className = 'object-cover',
    sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw',
}: LazyImageProps) {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    if (!src || error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800">
                <Package className="w-12 h-12 text-zinc-300 dark:text-zinc-700" />
            </div>
        );
    }

    const useNextImage = src.includes('/uploads/');

    return (
        <div className="relative w-full h-full">
            {!loaded && (
                <div className="absolute inset-0 bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
            )}
            {useNextImage ? (
                <Image
                    src={src}
                    alt={alt}
                    fill
                    sizes={sizes}
                    loading="lazy"
                    className={`${className} transition-opacity duration-300 ${
                        loaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    onLoad={() => setLoaded(true)}
                    onError={() => setError(true)}
                />
            ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={src}
                    alt={alt}
                    loading="lazy"
                    decoding="async"
                    className={`absolute inset-0 w-full h-full ${className} transition-opacity duration-300 ${
                        loaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    onLoad={() => setLoaded(true)}
                    onError={() => setError(true)}
                />
            )}
        </div>
    );
}
