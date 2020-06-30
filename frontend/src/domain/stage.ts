import CameraControls from 'camera-controls'
import * as THREE from 'three'

import { Avatar } from './avatar'

CameraControls.install({ THREE })

export enum CanvasSize {
  middle,
  wide,
}

export class Stage {
  private readonly canvas: HTMLCanvasElement

  private readonly renderer: THREE.WebGLRenderer

  private readonly cameraControls: CameraControls

  private readonly clock: THREE.Clock = new THREE.Clock()

  private readonly scene: THREE.Scene = new THREE.Scene()

  private cancelingToken = 0

  private directionalLight = new THREE.DirectionalLight(0xffffff, 1.0)

  private camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.25,
    50,
  )

  private avatar?: Avatar

  private static stageWidth(size: CanvasSize): number {
    switch (size) {
      case CanvasSize.middle: {
        if (window.innerWidth > 420 && window.innerWidth > window.innerHeight) {
          return window.innerWidth * 0.45
        }
        return window.parent.screen.width
      }
      default:
        return window.innerWidth - 200
    }
  }

  constructor(canvas: HTMLCanvasElement, canvasSize: CanvasSize = CanvasSize.wide) {
    this.canvas = canvas
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      canvas: this.canvas,
      antialias: false,
      preserveDrawingBuffer: false,
    })

    this.cameraControls = new CameraControls(this.camera, this.renderer.domElement)

    this.cameraControls.rotateTo(180 * THREE.MathUtils.DEG2RAD, 90 * THREE.MathUtils.DEG2RAD, false)

    this.directionalLight.position.set(0, 20, 0)
    this.renderer.setClearColor(0x29323b, 1.0)
    this.scene.add(this.directionalLight)

    const resize = () => {
      const width = Stage.stageWidth(canvasSize)
      const height = canvasSize === CanvasSize.wide ? window.innerHeight : width
      this.onSizeChange(width, height)
    }
    window.addEventListener('resize', () => resize())
    resize()

    this.update()
  }

  private onSizeChange(width: number, height: number) {
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.camera.aspect = width / height
    this.renderer.setSize(width, height)
    this.camera.updateProjectionMatrix()
  }

  public getSize() {
    const v = new THREE.Vector2()
    this.renderer.getSize(v)
    return [v.x, v.y]
  }

  public setAvatar(avatar: Avatar) {
    if (this.avatar) {
      this.avatar.destroy()
    }
    avatar.addToScene(this.scene, this.camera)
    this.avatar = avatar
    this.cameraControls.moveTo(0, this.avatar.getHead().y - 0.2, 0, false)
    this.cameraControls.dollyTo(1, false)

    return this.avatar
  }

  public destroy() {
    cancelAnimationFrame(this.cancelingToken)
    this.avatar?.destroy()
    this.scene.dispose()
  }

  private update() {
    const delta = this.clock.getDelta()
    const elapsedTime = this.clock.getElapsedTime()
    this.avatar?.update(delta, elapsedTime)
    this.cameraControls.update(delta)
    this.renderer.render(this.scene, this.camera)

    this.cancelingToken = requestAnimationFrame(() => this.update())
  }

  public zoom() {
    this.cameraControls.moveTo(0, this.avatar!.getHead().y, 0, false)
    this.cameraControls.dollyTo(0.6, false)

    return this.avatar
  }
}
