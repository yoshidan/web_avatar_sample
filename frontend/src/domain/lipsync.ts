import { VRMBlendShapeProxy, VRMSchema } from '@pixiv/three-vrm'

/**
 * 似非リップシンク
 */
export class LipSync {
  public meter?: any

  private mediaStreamSource?: AudioNode

  private audioContext?: AudioContext

  private readonly blendShapeProxy: VRMBlendShapeProxy

  constructor(blendShapeProxy: VRMBlendShapeProxy) {
    this.blendShapeProxy = blendShapeProxy
  }

  public start(stream: MediaStream) {
    this.audioContext = new AudioContext()
    this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream)
    this.meter = LipSync.createAudioMeter(this.audioContext)
    this.mediaStreamSource.connect(this.meter)
  }

  public destroy(): Promise<any> {
    this.meter?.shutdown()
    this.meter = null
    this.mediaStreamSource?.disconnect()
    return this.audioContext?.close().catch(() => {}) || Promise.resolve()
  }

  public update(deltaTime: number, elapsedTime: number) {
    if (this.meter) {
      const blendShape = this.blendShapeProxy
      const target = VRMSchema.BlendShapePresetName.O // LIP_SYNC[index];
      const { volume } = this.meter
      if (volume < 0.08) {
        blendShape.setValue(target, 0)
      } else {
        const next = (Math.sin(elapsedTime * 30) + 1.0) * 0.25
        blendShape.setValue(target, next)
      }
    }
  }

  private static createAudioMeter(audioContext: AudioContext) {
    const processor: any = audioContext.createScriptProcessor(512)
    processor.onaudioprocess = (event: any) => {
      const buf = event.inputBuffer.getChannelData(0)
      const bufLength = buf.length
      let sum = 0
      let x

      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < bufLength; i++) {
        x = buf[i]
        if (Math.abs(x) >= processor.clipLevel) {
          processor.clipping = true
          processor.lastClip = window.performance.now()
        }
        sum += x * x
      }
      const rms = Math.sqrt(sum / bufLength)
      processor.volume = Math.max(rms, processor.volume * processor.averaging)
    }
    processor.clipping = false
    processor.lastClip = 0
    processor.volume = 0
    processor.clipLevel = 0.98
    processor.averaging = 0.95
    processor.clipLag = 750

    processor.connect(audioContext.destination)

    processor.checkClipping = () => {
      if (!processor.clipping) {
        return false
      }
      if (processor.lastClip + processor.clipLag < window.performance.now()) {
        processor.clipping = false
      }
      return processor.clipping
    }

    processor.shutdown = () => {
      processor.disconnect()
      processor.onaudioprocess = null
    }

    return processor
  }
}
