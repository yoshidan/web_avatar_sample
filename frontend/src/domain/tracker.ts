import 'facetransfer/dist/jeelizFaceTransferES6'
import { VRMBlendShapeProxy, VRMHumanoid, VRMSchema } from '@pixiv/three-vrm'
import { GLTFNode } from '@pixiv/three-vrm/types/vrm/types'
import * as THREE from 'three'

const Q1 = new THREE.Quaternion()
const Q2 = new THREE.Quaternion()
const E1 = new THREE.Euler(0, 0, 0)
const E2 = new THREE.Euler(0, 0, 0)

// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
// eslint-disable-next-line no-underscore-dangle
const _tracker = window.JEEFACETRANSFERAPI

/**
 * Head Pose Estimation と Eye Blink Detectionのタスク
 */
export class FaceTracker {
  private readonly modelJson: any

  private readonly trackingCanvasId: string

  private head?: GLTFNode

  private hips?: GLTFNode

  private blendShapeProxy?: VRMBlendShapeProxy

  private sleeping: boolean

  constructor(model: any, trackingCanvasId: string) {
    this.modelJson = model
    this.sleeping = false
    this.trackingCanvasId = trackingCanvasId
  }

  public setAvatar(humanoid: VRMHumanoid, blendShapeProxy: VRMBlendShapeProxy) {
    this.blendShapeProxy = blendShapeProxy
    this.head = humanoid.getBoneNode(VRMSchema.HumanoidBoneName.Head)!
    this.hips = humanoid.getBoneNode(VRMSchema.HumanoidBoneName.Hips)!
  }

  public stop() {
    if (this.isTracking()) {
      this.sleeping = true
      _tracker.switch_sleep(true)
    }
    if (this.blendShapeProxy) {
      this.blendShapeProxy.setValue(VRMSchema.BlendShapePresetName.Blink, 0)
    }
  }

  public start(): Promise<boolean> {
    this.sleeping = false

    // モデルロード済みは即時開始可能
    if (_tracker.initialized) {
      _tracker.switch_sleep(false)
      return Promise.resolve(true)
    }

    // 初回は顔認識まで時間がかかる
    _tracker.switch_displayVideo(false)

    return new Promise((resolve, reject) => {
      _tracker.init({
        NNC: this.modelJson,
        canvasId: this.trackingCanvasId,
        callbackReady: (error: Error) => {
          if (error) {
            reject(error)
          } else {
            this.checkDetection(resolve)
          }
        },
      })
    })
  }

  private checkDetection(onDetected: (result: boolean) => void) {
    if (_tracker.is_detected && _tracker.is_detected()) {
      onDetected(true)
      return
    }
    setTimeout(() => this.checkDetection(onDetected), 1000)
  }

  public isTracking() {
    return _tracker.initialized && !this.sleeping
  }

  public update(deltaTime: number) {
    if (!this.isTracking()) return false

    // 検知失敗時はリセット
    if (!_tracker.is_detected || !_tracker.is_detected()) {
      const eulerHead = E1.set(0, 0, 0)
      const qHead = this.head!.quaternion.slerp(
        Q1.setFromEuler(eulerHead),
        Math.min(deltaTime * 5, 1.0),
      )
      this.head!.quaternion.copy(qHead)

      const eulerHip = E2.set(0, 0, 0)
      const qHip = this.hips!.quaternion.slerp(
        Q2.setFromEuler(eulerHip),
        Math.min(deltaTime * 5, 1.0),
      )
      this.hips!.quaternion.copy(qHip)
      return true
    }

    _tracker.set_animateDelay(deltaTime)

    // lip sync は音声で実行するので不要
    const morph = _tracker.get_morphTargetInfluencesStabilized()
    const eyeRightClose = morph[8]
    const eyeLeftClose = morph[9]
    const blink = Math.max(eyeLeftClose, eyeRightClose)
    if (blink >= 0.8) {
      this.blendShapeProxy!.setValue(VRMSchema.BlendShapePresetName.Blink, blink)
    } else {
      this.blendShapeProxy!.setValue(VRMSchema.BlendShapePresetName.Blink, 0)
    }

    const rotation = _tracker.get_rotationStabilized()
    const eulerHead = E1.set(
      FaceTracker.clampHead(-rotation[0] / 2),
      FaceTracker.clampHead(rotation[1]),
      FaceTracker.clampHead(-rotation[2] * 0.7),
    )
    const qHead = this.head!.quaternion.slerp(
      Q1.setFromEuler(eulerHead),
      Math.min(deltaTime * 5, 1.0),
    )
    this.head!.quaternion.copy(qHead)

    const eulerHip = E2.set(
      FaceTracker.clampHip(-rotation[0] / 6),
      FaceTracker.clampHip(rotation[1] / 6),
      FaceTracker.clampHip(-rotation[2] / 5),
    )
    const qHip = this.hips!.quaternion.slerp(
      Q2.setFromEuler(eulerHip),
      Math.min(deltaTime * 5, 1.0),
    )
    this.hips!.quaternion.copy(qHip)

    return true
  }

  private static clampHip(value: number) {
    return Math.min(Math.max(value, -0.1), 0.1)
  }

  private static clampHead(value: number) {
    return Math.min(Math.max(value, -1.0), 1.0)
  }
}
