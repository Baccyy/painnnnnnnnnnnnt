import Cryptr from 'cryptr'
import { createRef, FC, useEffect, useState } from 'react'
import { ReactSketchCanvas, ReactSketchCanvasRef } from 'react-sketch-canvas'
import { useLocation } from 'react-router-dom'
import { ArrowUturnLeftIcon, ArrowUturnRightIcon, TrashIcon, PencilIcon, CheckIcon } from '@heroicons/react/24/outline'
import { Button, ColorRow, SizeRow, Spinner } from '../../components'
import { StyledCanvasView } from '.'

const CanvasView: FC = () => {
  const cryptr = new Cryptr(process.env.REACT_APP_SECRET!)
  const canvas = createRef<ReactSketchCanvasRef>()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [size, setSize] = useState(5)
  const [mode, setMode] = useState<'pencil' | 'eraser'>('pencil')
  const [color, setColor] = useState('#000000')
  const [channelName, setChannelName] = useState('general')

  const undo = () => {
    canvas.current?.undo()
  }

  const redo = () => {
    canvas.current?.redo()
  }

  const clear = () => {
    canvas.current?.clearCanvas()
  }

  const switchMode = (modeToSwitch: typeof mode) => {
    const isEraseMode = modeToSwitch === 'eraser' ? true : false
    setMode(modeToSwitch)
    canvas.current?.eraseMode(isEraseMode)
  }

  const resetState = () => {
    setSent(false)
    switchMode('pencil')
    setSize(5)
    setColor('#000000')
    canvas.current?.resetCanvas()
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.shiftKey && e.metaKey && e.key === 'z') {
      return redo()
    }
    if (e.metaKey && e.key === 'z') {
      return undo()
    }
  }

  const sendMessage = async () => {
    try {
      setLoading(true)

      const urlParams = new URLSearchParams(location.search)
      const params = Object.fromEntries(urlParams)

      if (!params.pid) {
        return
      }

      const decryptedString = cryptr.decrypt(params.pid)
      const session = JSON.parse(decryptedString)
      const image = await canvas.current?.exportImage('png')

      const body = {
        image,
        ...session
      }

      await fetch('https://paint-bot.up.railway.app/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      window.close()
      setSent(true)
    }
    catch (err) {
      console.error(err)
    }
    finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search)
    const params = Object.fromEntries(urlParams)
    setChannelName(params?.cname || 'general')
  }, [location.search])

  useEffect(() => {
    document.addEventListener('keydown', (e) => handleKeyDown(e))

    return () => {
      document.removeEventListener('keydown', (e) => handleKeyDown(e))
    }
  }, [])

  return (
    <StyledCanvasView mode={mode} sent={sent}>
      <div className="canvas-header">
        <div className="canvas-logo">
          <img src="/paint-icon.png" alt="Paint Logo"/>
          <h1>Paint</h1>
        </div>
        <div className="canvas-header-actions">
          <Button isIcon onClick={() => undo()}>
            <ArrowUturnLeftIcon/>
          </Button>
          <Button isIcon onClick={() => redo()}>
            <ArrowUturnRightIcon/>
          </Button>
        </div>
      </div>
      <div className="canvas-container">
        <ReactSketchCanvas
          className="canvas"
          strokeWidth={size}
          eraserWidth={size}
          strokeColor={color}
          ref={canvas}
        />
      </div>
      <div className="canvas-actions">
        <div className="canvas-actions-group">
          <div className="canvas-actions-group canvas-tools">
            <Button isIcon isActive={mode === 'pencil'} onClick={() => switchMode('pencil')}>
              <PencilIcon/>
            </Button>
            <Button isIcon isActive={mode === 'eraser'} onClick={() => switchMode('eraser')}>
              Er
            </Button>
            <Button className="clear-btn" isIcon onClick={() => clear()}>
              <TrashIcon/>
            </Button>
          </div>
        </div>
        <SizeRow value={size} onSelect={(size) => setSize(size)} />
      </div>
      <ColorRow value={color} onSelect={(color) => setColor(color)} />
      <Button className="send-button" disabled={sent || loading} onClick={() => sendMessage()}>
        {!sent && !loading && `Send in #${channelName}`}
        {sent && !loading && <><CheckIcon className="check-icon"/> Painting sent</>}
        {loading && <Spinner/>}
      </Button>
      {sent && <span className="try-another-message">Want to paint something else? <a onClick={() => resetState()}>Reset canvas</a>.</span>}
    </StyledCanvasView>
  )
}

export default CanvasView
