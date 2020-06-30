import React, { ReactNode, useEffect, useRef, useState } from 'react'

import { Avatar } from '../domain/avatar'
import { Stage } from '../domain/stage'
import { MediaStreamRepository } from '../repository/MediaStreamRepository'
import { loadAvatar } from '../util'

type SectionProps = {
  title: string
  children: React.ReactNode
}

function Section({ title, children }: SectionProps) {
  return (
    <section
      style={{
        marginBottom: 10,
      }}
    >
      <div
        style={{
          paddingLeft: 5,
          lineHeight: '20px',
          backgroundColor: 'rgb(29, 161, 242',
          color: 'white',
          fontSize: '12px',
          height: 20,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: '12px', padding: 5 }}>{children}</div>
    </section>
  )
}

type ItemProps = {
  title: string
  value?: ReactNode
  children?: ReactNode
}

function Item({ title, value, children }: ItemProps) {
  return (
    <div style={{ padding: 5 }}>
      <span>{title}</span> {value ? <span>: {value}</span> : children}
    </div>
  )
}

export function Operation() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [avatar, setAvatar] = useState<Avatar | null>(null)

  useEffect(() => {
    const stage = new Stage(canvas.current!)
    window.addEventListener('dragover', (e) => e.preventDefault())
    const onLoad = async (e: DragEvent) => {
      e.preventDefault()
      const { files } = e.dataTransfer!
      if (!files || !files.length) {
        return
      }
      const loadedAvatar = await loadAvatar(files, stage)
      setAvatar(loadedAvatar)
    }
    window.addEventListener('drop', onLoad)
    return () => {
      window.removeEventListener('drop', onLoad)
      stage.destroy()
    }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'row' }}>
      <div style={{ width: 200 }}>
        <Section title="基本情報">
          <div>
            <Item title="作成者" value={avatar?.licence().author} />
            <Item title="名前" value={avatar?.licence().title} />
            <Item title="利用可能ユーザ" value={avatar?.licence().allowedUserName} />
            <Item title="ライセンス" value={avatar?.licence().licenseName} />
            <Item title="性的利用" value={avatar?.licence().sexualUssageName} />
            <Item title="暴力的利用" value={avatar?.licence().violentUssageName} />
            <Item title="商用利用" value={avatar?.licence().commercialUssageName} />
            <Item title="連絡先" value={avatar?.licence().contactInformation} />
          </div>
        </Section>
        <Section title="表情操作">
          <button onClick={() => avatar?.emotionNeutral()}>ニュートラル</button>
          <button onClick={() => avatar?.emotionJoy()}>喜</button>
          <button onClick={() => avatar?.emotionAngry()}>怒</button>
          <button onClick={() => avatar?.emotionSorrow()}>哀</button>
          <button onClick={() => avatar?.emotionFun()}>楽</button>
          <button onClick={() => avatar?.emotionA()}>あ</button>
          <button onClick={() => avatar?.emotionI()}>い</button>
          <button onClick={() => avatar?.emotionU()}>う</button>
          <button onClick={() => avatar?.emotionE()}>え</button>
          <button onClick={() => avatar?.emotionO()}>お</button>
          <button onClick={() => avatar?.emotionSurprised()}>驚き</button>
          <button onClick={() => avatar?.emotionExtra()}>その他</button>
        </Section>
        <Section title="視点変更">
          <button onClick={() => avatar?.cameraFirstPerson()}>一人称視点</button>
          <br />
          <button onClick={() => avatar?.cameraThirdPerson()}>３人称視点</button>
        </Section>
        <Section title="アニメーション">
          <button onClick={() => avatar?.startBlinkAnimation()}>瞬き</button>
          <br />
          <button onClick={() => avatar?.playAnimation()}>ボーンアニメーション</button>
          <br />
          <button
            onClick={() => {
              avatar?.stopBlinkAnimation()
              avatar?.stopAnimation()
            }}
          >
            終了
          </button>
        </Section>
        <Section title="顔トラッキング">
          <button
            onClick={async () => {
              const stream = await new MediaStreamRepository().getDeviceStream({
                video: false,
                audio: true,
              })
              avatar?.startLipSync(stream)
              await avatar?.startFaceTracking()
            }}
          >
            開始
          </button>
          <br />
          <button
            onClick={() => {
              avatar?.stopFaceTracking()
              avatar?.stopLipSync()
            }}
          >
            終了
          </button>
        </Section>
        <Section title="チャット">
          <button
            onClick={async () => {
              window.location.href = '/chat'
            }}
          >
            開始
          </button>
          <br />
        </Section>
      </div>
      <canvas id="avatar" ref={canvas} />
      <canvas id="tracking" style={{ display: 'none' }} />
    </div>
  )
}
