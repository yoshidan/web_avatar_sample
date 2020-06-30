/**
 * 相手先毎に作成
 */
export class RTCPeer {
  public onceConnected = false

  private uuid: string

  private peerConnection: RTCPeerConnection | null

  private remoteStream?: MediaStream | null

  constructor(uuid: string) {
    this.uuid = uuid
    this.peerConnection = this.createPeerConnection()
  }

  public createOffer(): Promise<RTCSessionDescriptionInit> {
    return this.peerConnection!.createOffer({
      offerToReceiveVideo: true,
    }).then((description: RTCSessionDescriptionInit) => {
      return this.peerConnection!.setLocalDescription(description).then(() => description)
    })
  }

  public createAnswer(remoteDescription: any): Promise<RTCSessionDescriptionInit> {
    return this.peerConnection!.setRemoteDescription(new RTCSessionDescription(remoteDescription))
      .then(() => this.peerConnection!.createAnswer())
      .then((localDescription: RTCSessionDescriptionInit) => {
        return this.peerConnection!.setLocalDescription(localDescription).then(() => {
          return localDescription
        })
      })
  }

  public setRemoteDescription(description: any): Promise<RTCPeerConnection> {
    const remoteDescription = new RTCSessionDescription(description)
    return this.peerConnection!.setRemoteDescription(remoteDescription).then(
      () => this.peerConnection!,
    )
  }

  public addIceCandidate(candidate: RTCIceCandidate) {
    this.peerConnection!.addIceCandidate(candidate).catch(console.error)
  }

  public getPeerConnection() {
    return this.peerConnection
  }

  public getRemoteUUID() {
    return this.uuid
  }

  public dispose() {
    if (this.peerConnection) {
      this.onceConnected = false
      this.peerConnection.close()
      this.peerConnection.ontrack = null
      this.peerConnection.oniceconnectionstatechange = null
      this.peerConnection.onicecandidate = null
      if (this.remoteStream) {
        this.remoteStream.getTracks().forEach((track) => track.stop())
        this.remoteStream = null
      }
      this.peerConnection = null
    }
  }

  private createPeerConnection() {
    const con = new RTCPeerConnection()
    con.ontrack = (event) => {
      // eslint-disable-next-line prefer-destructuring
      const stream = event.streams[0]
      if (stream.getVideoTracks().length !== 1 || stream.getAudioTracks().length !== 1) {
        console.log(`insufficient tracks :${this.uuid}`)
        return
      }
      // TODO 本来こんなところでdomをひっぱってはいけない。Peerが生成されたらvideoを生成するようにReactに移譲する
      const video = document.getElementById('remote') as any
      video.srcObject = stream
      video.play()
      video.volume = 1.0
    }
    return con
  }
}
