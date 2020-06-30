import React, { useEffect, useRef } from 'react'

import { Avatar } from '../domain/avatar'
import { RTCManager } from '../domain/rtc/RTCManager'
import { CanvasSize, Stage } from '../domain/stage'
import { MediaStreamRepository } from '../repository/MediaStreamRepository'
import { loadAvatar } from '../util'

async function startChat(canvas: any, avatar: Avatar) {
  // Canvasと合成する
  const stream = await new MediaStreamRepository().getDeviceStream({ video: false, audio: true })
  await avatar.startFaceTracking()
  avatar.startLipSync(stream)
  const localStream = new MediaStream([
    canvas.captureStream().getVideoTracks()[0],
    stream.getAudioTracks()[0],
  ])
  const rtcManager = new RTCManager(new Date().getTime().toString(), localStream, 'CH01')
  rtcManager.start()
}

export function Chat() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const video = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const stage = new Stage(canvas.current!, CanvasSize.middle)
    window.addEventListener('dragover', (e) => e.preventDefault())
    const onLoad = async (e: DragEvent) => {
      e.preventDefault()
      const { files } = e.dataTransfer!
      if (!files || !files.length) {
        return
      }
      const avatar = await loadAvatar(files, stage)
      stage.zoom()
      window.removeEventListener('drop', onLoad)
      await startChat(canvas.current!, avatar)
    }
    const resize = () => {
      const sizes = stage.getSize()
      video.current!.style.width = `${sizes[0]}px`
      video.current!.style.height = `${sizes[1]}px`
    }
    resize()
    window.addEventListener('resize', () => resize())
    window.addEventListener('drop', onLoad)
    return () => {
      window.removeEventListener('drop', onLoad)
      stage.destroy()
    }
  }, [])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div style={{ margin: 10 }}>
        <canvas id="avatar" ref={canvas} />
        <canvas id="tracking" style={{ display: 'none' }} />
        <div>こっちにVRMをドラッグ&ドロップ</div>
      </div>
      <div style={{ margin: 10 }}>
        <div style={{ border: '1px solid grey' }}>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video id="remote" ref={video} />
        </div>
        <div>こっちに相手の映像が表示されます</div>
      </div>
    </div>
  )
}
