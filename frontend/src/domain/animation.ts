import { VRMSchema, VRMHumanoid } from '@pixiv/three-vrm'
import * as THREE from 'three'

export const UNITY_VRM_MAP: {
  [name: string]: VRMSchema.HumanoidBoneName | undefined
} = Object.freeze({
  Hips: VRMSchema.HumanoidBoneName.Hips,
  Spine: VRMSchema.HumanoidBoneName.Spine,
  Chest: VRMSchema.HumanoidBoneName.Chest,
  LeftUpperLeg: VRMSchema.HumanoidBoneName.LeftUpperLeg,
  LeftLowerLeg: VRMSchema.HumanoidBoneName.LeftLowerLeg,
  LeftFoot: VRMSchema.HumanoidBoneName.LeftFoot,
  LeftToes: VRMSchema.HumanoidBoneName.LeftToes,
  RightUpperLeg: VRMSchema.HumanoidBoneName.RightUpperLeg,
  RightLowerLeg: VRMSchema.HumanoidBoneName.RightLowerLeg,
  RightFoot: VRMSchema.HumanoidBoneName.RightFoot,
  RightToes: VRMSchema.HumanoidBoneName.RightToes,
  Neck: VRMSchema.HumanoidBoneName.Neck,
  Head: VRMSchema.HumanoidBoneName.Head,
  LeftEye: VRMSchema.HumanoidBoneName.LeftEye,
  RightEye: VRMSchema.HumanoidBoneName.RightEye,
  LeftShoulder: VRMSchema.HumanoidBoneName.LeftShoulder,
  LeftUpperArm: VRMSchema.HumanoidBoneName.LeftUpperArm,
  LeftLowerArm: VRMSchema.HumanoidBoneName.LeftLowerArm,
  LeftHand: VRMSchema.HumanoidBoneName.LeftHand,
  RightShoulder: VRMSchema.HumanoidBoneName.RightShoulder,
  RightUpperArm: VRMSchema.HumanoidBoneName.RightUpperArm,
  RightLowerArm: VRMSchema.HumanoidBoneName.RightLowerArm,
  RightHand: VRMSchema.HumanoidBoneName.RightHand,
  LeftRingProximal: VRMSchema.HumanoidBoneName.LeftRingProximal,
  LeftRingIntermediate: VRMSchema.HumanoidBoneName.LeftRingIntermediate,
  LeftRingDistal: VRMSchema.HumanoidBoneName.LeftRingDistal,
  LeftThumbProximal: VRMSchema.HumanoidBoneName.LeftThumbProximal,
  LeftThumbIntermediate: VRMSchema.HumanoidBoneName.LeftThumbIntermediate,
  LeftThumbDistal: VRMSchema.HumanoidBoneName.LeftThumbDistal,
  LeftIndexProximal: VRMSchema.HumanoidBoneName.LeftIndexProximal,
  LeftIndexIntermediate: VRMSchema.HumanoidBoneName.LeftIndexIntermediate,
  LeftIndexDistal: VRMSchema.HumanoidBoneName.LeftIndexDistal,
  LeftMiddleProximal: VRMSchema.HumanoidBoneName.LeftMiddleProximal,
  LeftMiddleIntermediate: VRMSchema.HumanoidBoneName.LeftMiddleIntermediate,
  LeftMiddleDistal: VRMSchema.HumanoidBoneName.LeftMiddleDistal,
  LeftLittleProximal: VRMSchema.HumanoidBoneName.LeftLittleProximal,
  LeftLittleIntermediate: VRMSchema.HumanoidBoneName.LeftLittleIntermediate,
  LeftLittleDistal: VRMSchema.HumanoidBoneName.LeftLittleDistal,
  RightRingProximal: VRMSchema.HumanoidBoneName.RightRingProximal,
  RightRingIntermediate: VRMSchema.HumanoidBoneName.RightRingIntermediate,
  RightRingDistal: VRMSchema.HumanoidBoneName.RightRingDistal,
  RightThumbProximal: VRMSchema.HumanoidBoneName.RightThumbProximal,
  RightThumbIntermediate: VRMSchema.HumanoidBoneName.RightThumbIntermediate,
  RightThumbDistal: VRMSchema.HumanoidBoneName.RightThumbDistal,
  RightIndexProximal: VRMSchema.HumanoidBoneName.RightIndexProximal,
  RightIndexIntermediate: VRMSchema.HumanoidBoneName.RightIndexIntermediate,
  RightIndexDistal: VRMSchema.HumanoidBoneName.RightIndexDistal,
  RightMiddleProximal: VRMSchema.HumanoidBoneName.RightMiddleProximal,
  RightMiddleIntermediate: VRMSchema.HumanoidBoneName.RightMiddleIntermediate,
  RightMiddleDistal: VRMSchema.HumanoidBoneName.RightMiddleDistal,
  RightLittleProximal: VRMSchema.HumanoidBoneName.RightLittleProximal,
  RightLittleIntermediate: VRMSchema.HumanoidBoneName.RightLittleIntermediate,
  RightLittleDistal: VRMSchema.HumanoidBoneName.RightLittleDistal,
})

export interface AnimationClipKeyframe {
  name: VRMSchema.HumanoidBoneName | VRMSchema.BlendShapePresetName
  type: 'morph' | 'rotation' | 'position'
  times: Array<number>
  values: Array<number>
}

export interface AnimationClipData {
  duration: number
  tracks: Array<AnimationClipKeyframe>
}

export class VRMAnimation {
  private readonly animationClipData: AnimationClipData

  private readonly animationName: string

  constructor(animationClipJson: Array<any>, animationName: string) {
    this.animationClipData = VRMAnimation.convertJson(animationClipJson)
    this.animationName = animationName
  }

  /**
   * 複数のアニメーションを合成する
   * @param animationRawDatas
   */
  private static convertJson(animationRawDatas: Array<any>): AnimationClipData {
    const boneAnims: {
      [name: string]: { position: Array<number>; rotation: Array<number>; times: Array<number> }
    } = {}
    const animationRawData: Array<any> = []
    animationRawDatas.forEach((a) => animationRawData.push(...a.slice(1)))
    const duration = 5.0 * animationRawDatas.length

    const frameCount = animationRawData.length
    const interval = duration / frameCount

    let count = 0

    // 先頭はデフォルトのTポーズなので無視する
    animationRawData.forEach((boneAnimations) => {
      count += 1
      boneAnimations.vrmAnimations.forEach((bone: any) => {
        const humanBone = UNITY_VRM_MAP[bone.n]
        if (!humanBone) {
          return
        }
        const tracks = boneAnims[bone.n]
        const r: Array<number> = [
          -bone.r[0] / 10000.0,
          -bone.r[1] / 10000.0,
          bone.r[2] / 10000.0,
          bone.r[3] / 10000.0,
        ]
        if (tracks) {
          tracks.rotation.push(...r)
          tracks.times.push(count * interval)
        } else {
          boneAnims[bone.n] = { position: bone.p, rotation: r, times: [count * interval] }
        }
      })
    })

    // ローテーションのみにする
    const rotationTracks: Array<AnimationClipKeyframe> = Object.keys(boneAnims).map((key) => ({
      name: UNITY_VRM_MAP[key]!,
      type: 'rotation',
      times: boneAnims[key].times,
      values: boneAnims[key].rotation,
    }))

    return {
      duration,
      tracks: rotationTracks,
    }
  }

  /**
   * モデル別にビルドする
   * @param blendShapeProxy
   * @param humanoid
   */
  public buildForVRM(humanoid: VRMHumanoid): THREE.AnimationClip {
    const tracks: Array<THREE.KeyframeTrack> = []

    this.animationClipData.tracks.forEach((normalizedTrack) => {
      if (normalizedTrack.type === 'rotation') {
        // アニメーションで指定されているボーンが存在しなかったらその箇所は無視
        const humanBoneName = normalizedTrack.name as VRMSchema.HumanoidBoneName
        const bone = humanoid.getBoneNode(humanBoneName)
        if (!bone) {
          return
        }

        const track = new THREE.QuaternionKeyframeTrack(
          `${bone.name}.quaternion`,
          normalizedTrack.times,
          normalizedTrack.values,
        )

        tracks.push(track)
      }
    })
    const clip = new THREE.AnimationClip(
      this.animationName,
      this.animationClipData.duration,
      tracks,
    )
    return clip
  }
}
