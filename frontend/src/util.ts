import { Avatar } from './domain/avatar'
import { Stage } from './domain/stage'
import { FaceTracker } from './domain/tracker'
import { AnimationRepository } from './repository/AnimationRepository'
import { AvatarRepository } from './repository/AvatarRepository'
import { MLRepository } from './repository/MLRepository'

export async function loadAvatar(files: FileList, stage: Stage): Promise<Avatar> {
  const file = files[0]
  const blob = new Blob([file], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const loadedAvatar = await new AvatarRepository().load(url)
  stage.setAvatar(loadedAvatar)

  // フェイストラッカー
  const mlModel = await new MLRepository().loadModel()
  const tracker = new FaceTracker(mlModel, 'tracking')
  loadedAvatar.setFaceTracker(tracker)

  // アニメーション
  const animation = await new AnimationRepository().loadAnimation()
  loadedAvatar.setAnimation(animation)

  const poseAnimation = await new AnimationRepository().loadPosingAnimation()
  loadedAvatar.setPoseAnimation(poseAnimation)

  return loadedAvatar
}
