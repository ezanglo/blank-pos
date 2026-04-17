export interface StorageUploadParams {
  body: Buffer
  contentType: string
  /** Relative key, e.g. `media/{uuid}.png` */
  objectKey: string
}

export interface StorageProvider {
  upload(params: StorageUploadParams): Promise<string>
  /** Resolves object from a URL previously returned by `upload`. */
  deleteByPublicUrl(url: string): Promise<void>
}
