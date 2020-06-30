import { RTCPeer } from './RTCPeer'

interface Message {
  type: string
  uuid: string
  targetUUID: string
  ice: RTCIceCandidate
}

/**
 * RTCPeerを管理する。
 * 現在は相手一つしか対応してません。
 * 複数人にするにはRTCPeerをArrayなどで管理する必要があります。
 */
export class RTCManager {
  private socket?: WebSocket

  private readonly localUUID: string

  private peer?: RTCPeer | null

  private readonly host: string

  private readonly localStream: MediaStream

  private currentStream: MediaStream

  constructor(localUUID: string, localStream: MediaStream, channelId: string) {
    this.host = `ws://localhost:8000/ws/control?channelId=${channelId}&uuid=${localUUID}`
    this.localUUID = localUUID
    this.localStream = localStream
    this.currentStream = this.localStream
  }

  public start(): void {
    this.socket = new WebSocket(this.host)
    this.socket.onopen = () => {
      this.receive()
      this.callme()
    }
    this.socket.onerror = (error) => {
      console.error(error)
      alert('シグナリングサーバ接続エラー')
    }
  }

  private callme() {
    this.send(
      JSON.stringify({
        type: 'callme',
        uuid: this.localUUID,
      }),
    )
  }

  private receive() {
    this.socket!.onmessage = (event: MessageEvent) => {
      const message: Message = JSON.parse(event.data)

      // 新しく参加要求
      switch (message.type) {
        case 'callme': {
          // Peerを生成する
          this.peer = this.createRTCPeer(message.uuid)

          // offer を送信
          this.peer.createOffer().then((local) => {
            const msg = JSON.stringify(local)
            const restore = JSON.parse(msg)
            // callme飛ばしてきた人にだけ受け入れて欲しいのでsendToiUIDをつける
            restore.uuid = this.localUUID
            restore.targetUUID = message.uuid
            console.log('send offer', restore)
            this.send(JSON.stringify(restore))
          })
          break
        }

        case 'offer': {
          // 自分宛でなければ無視する
          if (message.targetUUID !== this.localUUID) {
            return
          }

          // Peerを生成する
          this.peer = this.createRTCPeer(message.uuid)

          // Answer 送信
          this.peer.createAnswer(message).then((localDescription: RTCSessionDescriptionInit) => {
            const msg = JSON.stringify(localDescription)
            const restore = JSON.parse(msg)
            restore.uuid = this.localUUID
            restore.targetUUID = message.uuid
            const sending = JSON.stringify(restore)
            console.log('send answer', restore)
            this.socket!.send(sending)
          })
          break
        }

        case 'answer': {
          // 自分宛でなければ無視する
          if (message.targetUUID !== this.localUUID) {
            return
          }
          // リモートのSDPを設定する
          this.peer!.setRemoteDescription(message).catch(console.error)
          break
        }

        case 'candidate': {
          // 自分宛でなければ無視する
          if (message.targetUUID !== this.localUUID) {
            return
          }

          // 経路情報を設定する
          const candidate = new RTCIceCandidate(message.ice)
          this.peer!.addIceCandidate(candidate)
          break
        }

        default: {
          console.error('illegal message type')
        }
      }
    }
  }

  private send(message: string) {
    this.socket!.send(message)
  }

  private createRTCPeer(remoteUUID: string) {
    const peer = new RTCPeer(remoteUUID)
    const con = peer.getPeerConnection()!
    con.onicecandidate = (evt: RTCPeerConnectionIceEvent) => {
      if (evt.candidate) {
        const obj = {
          type: 'candidate',
          ice: evt.candidate,
          targetUUID: peer.getRemoteUUID(),
          uuid: this.localUUID,
        }
        const message = JSON.stringify(obj)
        console.log(`sending candidate=${message}`)
        this.send(message)
      }
    }

    con.oniceconnectionstatechange = (_: Event) => {
      const state = peer.getPeerConnection()!.iceConnectionState
      if (state === 'connected') {
        peer.onceConnected = true
      } else if (state === 'failed') {
        if (!peer.onceConnected) {
          alert('接続エラー')
        }
        peer.dispose()
        this.peer = null
      } else if (state === 'closed') {
        this.peer = null
      }
      console.log('managed peer after state changed ', state, this.peer)
    }

    this.localStream.getAudioTracks().forEach((track) => {
      peer.getPeerConnection()!.addTrack(track, this.localStream)
    })
    this.currentStream.getVideoTracks().forEach((track) => {
      peer.getPeerConnection()!.addTrack(track, this.localStream)
    })
    return peer
  }
}
