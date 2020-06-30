export class MediaStreamRepository {
  public getAudioDevices(): Promise<Array<MediaDeviceInfo>> {
    return navigator.mediaDevices
      .enumerateDevices()
      .then((devices: Array<MediaDeviceInfo>) => devices.filter((d) => d.kind === 'audioinput'))
  }

  public getVideoDevices(): Promise<Array<MediaDeviceInfo>> {
    return navigator.mediaDevices
      .enumerateDevices()
      .then((devices: Array<MediaDeviceInfo>) => devices.filter((d) => d.kind === 'videoinput'))
  }

  public getDeviceStream(option: any): Promise<MediaStream> {
    if ('getUserMedia' in navigator.mediaDevices) {
      return navigator.mediaDevices.getUserMedia(option)
    }
    return new Promise((resolve, reject) => {
      navigator.getUserMedia(option, resolve, reject)
    })
  }
}
