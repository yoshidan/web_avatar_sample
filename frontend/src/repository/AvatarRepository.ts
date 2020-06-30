import { VRM } from '@pixiv/three-vrm'
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

import { Avatar } from '../domain/avatar'

export class AvatarRepository {
  // eslint-disable-next-line class-methods-use-this
  public async load(path: string): Promise<Avatar> {
    const gltf = await new Promise<GLTF>((resolve, reject) => {
      const loader = new GLTFLoader()
      loader.load(path, resolve, () => {}, reject)
    })
    const vrm = await VRM.from(gltf)
    return new Avatar(vrm)
  }
}
