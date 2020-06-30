import { VRMAnimation } from '../domain/animation'

export class AnimationRepository {
  private cache?: VRMAnimation

  public async loadAnimation(): Promise<VRMAnimation> {
    if (this.cache) {
      return Promise.resolve(this.cache)
    }
    const response = await Promise.all([
      fetch('/animation04.json').then((r) => r.json()),
      fetch('/animation05.json').then((r) => r.json()),
    ])
    this.cache = new VRMAnimation(response, 'default')
    return this.cache
  }

  public async loadPosingAnimation(): Promise<VRMAnimation> {
    if (this.cache) {
      return Promise.resolve(this.cache)
    }
    const response = await Promise.all([fetch('/animation01.json').then((r) => r.json())])
    this.cache = new VRMAnimation(response, 'pose')
    return this.cache
  }
}
