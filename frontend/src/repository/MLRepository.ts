export class MLRepository {
  private cache?: any

  public async loadModel(): Promise<any> {
    if (this.cache) {
      return Promise.resolve(this.cache)
    }
    const response = await fetch('/jeefacetransferNNC.json').then((r) => r.json())
    this.cache = response
    return this.cache
  }
}
