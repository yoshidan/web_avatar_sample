import { VRM, VRMSchema } from '@pixiv/three-vrm'
import * as THREE from 'three'

import { VRMAnimation } from './animation'
import { LipSync } from './lipsync'
import { FaceTracker } from './tracker'

interface Pose {
  name: VRMSchema.HumanoidBoneName
  quaternion: THREE.Quaternion
}

export class Avatar {
  private scene?: THREE.Scene

  private camera?: THREE.Camera

  private readonly vrm: VRM

  private animationMixer?: THREE.AnimationMixer

  private blinkAnimation?: THREE.AnimationAction

  private animation?: THREE.AnimationAction

  private poseAnimation?: THREE.AnimationAction

  private blinkInterval?: any

  private faceTracker?: FaceTracker

  private readonly lipSync: LipSync

  private waitPose?: Array<Pose>

  constructor(vrm: VRM) {
    this.vrm = vrm
    this.vrm.springBoneManager!.reset()
    this.lipSync = new LipSync(this.vrm.blendShapeProxy!)
  }

  public setFaceTracker(faceTracker: FaceTracker) {
    this.faceTracker = faceTracker
    this.faceTracker.setAvatar(this.vrm.humanoid!, this.vrm.blendShapeProxy!)
  }

  public setAnimation(animation: VRMAnimation) {
    this.animation = this.animationMixer?.clipAction(animation.buildForVRM(this.vrm.humanoid!))
  }

  public setPoseAnimation(animation: VRMAnimation) {
    this.poseAnimation = this.animationMixer?.clipAction(animation.buildForVRM(this.vrm.humanoid!))
    this.poseAnimation?.play()
    setTimeout(() => {
      this.saveWaitPose()
      this.poseAnimation?.stop()
      this.setPose()
    }, 300)
  }

  public addToScene(scene: THREE.Scene, camera: THREE.Camera) {
    this.camera = camera
    this.scene = scene
    this.scene.add(this.vrm.scene)
    this.animationMixer = new THREE.AnimationMixer(scene)
    this.blinkAnimation = this.animationMixer.clipAction(this.createEyeBlinkAnimation())
    this.blinkAnimation.setLoop(THREE.LoopOnce, 1)
    this.vrm.lookAt!.target = camera
  }

  private clearBlendShape() {
    Object.keys(VRMSchema.BlendShapePresetName).forEach((key) => {
      this.vrm.blendShapeProxy!.setValue(key, 0.0)
    })
    this.vrm.blendShapeProxy!.setValue('Surprised', 0)
    this.vrm.blendShapeProxy!.setValue('Extra', 0)
  }

  public cameraFirstPerson() {
    this.vrm.firstPerson!.setup()
    this.camera?.layers.disable(this.vrm.firstPerson!.thirdPersonOnlyLayer!)
    this.camera?.layers.enable(this.vrm.firstPerson!.firstPersonOnlyLayer!)
  }

  public cameraThirdPerson() {
    this.camera?.layers.disable(this.vrm.firstPerson!.firstPersonOnlyLayer!)
    this.camera?.layers.enable(this.vrm.firstPerson!.thirdPersonOnlyLayer!)
  }

  public emotionJoy() {
    this.clearBlendShape()
    this.vrm.blendShapeProxy!.setValue(VRMSchema.BlendShapePresetName.Joy, 1.0)
  }

  public emotionAngry() {
    this.clearBlendShape()
    this.vrm.blendShapeProxy!.setValue(VRMSchema.BlendShapePresetName.Angry, 1.0)
  }

  public emotionSorrow() {
    this.clearBlendShape()
    this.vrm.blendShapeProxy!.setValue(VRMSchema.BlendShapePresetName.Sorrow, 1.0)
  }

  public emotionFun() {
    this.clearBlendShape()
    this.vrm.blendShapeProxy!.setValue(VRMSchema.BlendShapePresetName.Fun, 1.0)
  }

  public emotionA() {
    this.clearBlendShape()
    this.vrm.blendShapeProxy!.setValue(VRMSchema.BlendShapePresetName.A, 1.0)
  }

  public emotionI() {
    this.clearBlendShape()
    this.vrm.blendShapeProxy!.setValue(VRMSchema.BlendShapePresetName.I, 1.0)
  }

  public emotionU() {
    this.clearBlendShape()
    this.vrm.blendShapeProxy!.setValue(VRMSchema.BlendShapePresetName.U, 1.0)
  }

  public emotionE() {
    this.clearBlendShape()
    this.vrm.blendShapeProxy!.setValue(VRMSchema.BlendShapePresetName.E, 1.0)
  }

  public emotionO() {
    this.clearBlendShape()
    this.vrm.blendShapeProxy!.setValue(VRMSchema.BlendShapePresetName.O, 1.0)
  }

  public emotionNeutral() {
    this.clearBlendShape()
    this.vrm.blendShapeProxy!.setValue(VRMSchema.BlendShapePresetName.Neutral, 1.0)
  }

  public emotionSurprised() {
    this.clearBlendShape()
    this.vrm.blendShapeProxy!.setValue('Surprised', 1.0)
  }

  public emotionExtra() {
    this.clearBlendShape()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.vrm.blendShapeProxy!.setValue('Extra', 1.0)
  }

  public startFaceTracking(): Promise<boolean> {
    this.stopBlinkAnimation()
    this.stopAnimation()
    this.emotionNeutral()
    return this.faceTracker?.start() || Promise.resolve(true)
  }

  public startLipSync(stream: MediaStream) {
    this.lipSync?.start(stream)
  }

  public stopFaceTracking() {
    this.faceTracker?.stop()
    this.setPose()
    this.emotionNeutral()
  }

  public stopLipSync() {
    return this.lipSync?.destroy()
  }

  public licence(): VRMSchema.Meta {
    return this.vrm.meta!
  }

  public position(): THREE.Vector3 {
    return this.vrm.scene.position
  }

  public rotation(): THREE.Euler {
    return this.vrm.scene.rotation
  }

  public getHead(): THREE.Vector3 {
    const ref = new THREE.Vector3()
    this.vrm.firstPerson?.getFirstPersonWorldPosition(ref)
    return ref
  }

  public startBlinkAnimation() {
    this.blinkInterval = setInterval(() => {
      this.blinkAnimation?.reset()
      this.blinkAnimation?.play()
    }, 1000)
  }

  public stopBlinkAnimation() {
    if (this.blinkInterval) {
      clearInterval(this.blinkInterval)
      this.blinkInterval = null
    }
  }

  public stopAnimation() {
    this.animation?.stop()
  }

  public playAnimation() {
    this.animation?.reset()
    this.animation?.play()
  }

  public update(deltaTime: number, elapsedTime: number) {
    this.animationMixer?.update(deltaTime)
    this.lipSync?.update(deltaTime, elapsedTime)
    this.faceTracker?.update(deltaTime)
    this.vrm.update(deltaTime)
  }

  public destroy() {
    this.faceTracker?.stop()
    this.stopAnimation()
    this.stopBlinkAnimation()
    this.animationMixer?.stopAllAction()
    this.scene?.remove(this.vrm.scene)
  }

  private createEyeBlinkAnimation(): THREE.AnimationClip {
    const trackName = this.vrm.blendShapeProxy!.getBlendShapeTrackName(
      VRMSchema.BlendShapePresetName.Blink,
    )
    const duration = 0.1
    const steps = [0.0, 0.25, 0.5, 0.75, 1.0]

    const times = steps.map((step) => duration * step)
    const values = steps.map((step) => Math.sin(step * Math.PI))

    const tracks = []

    const track = new THREE.NumberKeyframeTrack(trackName!, times, values)
    tracks.push(track)

    return new THREE.AnimationClip('blinkAction', duration, tracks)
  }

  private setPose() {
    this.waitPose?.map((pose) => {
      this.vrm.humanoid!.getBoneNode(pose.name)!.quaternion.copy(pose.quaternion)
    })
  }

  private saveWaitPose() {
    const bones = this.vrm.humanoid!.humanBones
    const boneNames = Object.keys(bones) as Array<VRMSchema.HumanoidBoneName>
    this.waitPose = boneNames
      .map((name) => {
        const node = this.vrm.humanoid!.getBoneNode(name)!
        if (node) {
          return { name, quaternion: node.quaternion.clone() }
        }
        return null
      })
      .filter((i) => i) as Array<Pose>
  }
}
