"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { QrCode, Camera, CheckCircle, XCircle, Clock, AlertTriangle, Smartphone } from "lucide-react"
import jsQR from "jsqr"

interface ScanResult {
  success: boolean
  status?: "present" | "late"
  message: string
  error?: string
}

export function QRScanner() {
  const [isScanning, setIsScanning] = useState(false)
  const [manualToken, setManualToken] = useState("")
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout>()

  // Start camera for QR scanning
  const startCamera = async () => {
    try {
      setScanResult(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Use back camera on mobile
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsScanning(true)

        // Start scanning for QR codes
        scanIntervalRef.current = setInterval(scanQRCode, 500) // Scan every 500ms
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
      setScanResult({
        success: false,
        error: "Unable to access camera. Please check permissions or use manual entry.",
        message: "Camera access denied",
      })
    }
  }

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
    }
    setIsScanning(false)
  }

  // Scan QR code from video feed
  const scanQRCode = async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    try {
      // Use a QR code detection library (this is a simplified version)
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)

      if (code && code.data) {
        console.log("[v0] QR code detected:", code.data)
        await processToken(code.data)
      }
    } catch (error) {
      console.error("Error scanning QR code:", error)
    }
  }

  // Process scanned or manually entered token
  const processToken = async (token: string) => {
    if (!token.trim()) return

    setIsProcessing(true)
    setScanResult(null)

    try {
      console.log("[v0] Processing token:", token.substring(0, 10) + "...")

      const response = await fetch("/api/qr/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      })

      const data = await response.json()
      console.log("[v0] Scan response:", data)

      if (response.ok) {
        setScanResult({
          success: true,
          status: data.status,
          message: data.message,
        })

        // Stop scanning on successful scan
        if (isScanning) {
          stopCamera()
        }
        setManualToken("")
      } else {
        setScanResult({
          success: false,
          error: data.error,
          message: "Scan failed",
        })
      }
    } catch (error) {
      console.error("[v0] Error processing token:", error)
      setScanResult({
        success: false,
        error: "Network error. Please try again.",
        message: "Connection failed",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle manual token submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    processToken(manualToken)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const getResultIcon = () => {
    if (!scanResult) return null

    if (scanResult.success) {
      return scanResult.status === "present" ? (
        <CheckCircle className="h-8 w-8 text-green-600" />
      ) : (
        <Clock className="h-8 w-8 text-yellow-600" />
      )
    }
    return <XCircle className="h-8 w-8 text-red-600" />
  }

  const getResultColor = () => {
    if (!scanResult) return ""

    if (scanResult.success) {
      return scanResult.status === "present"
        ? "bg-green-50 border-green-200 text-green-800"
        : "bg-yellow-50 border-yellow-200 text-yellow-800"
    }
    return "bg-red-50 border-red-200 text-red-800"
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* QR Scanner Card */}
      <Card className="bg-white/95 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-blue-600" />
            QR Code Scanner
          </CardTitle>
          <CardDescription>Scan the QR code displayed by your teacher to mark attendance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera Scanner */}
          <div className="text-center">
            {!isScanning ? (
              <div className="space-y-4">
                <div className="w-64 h-64 mx-auto bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Camera not active</p>
                  </div>
                </div>
                <Button onClick={startCamera} className="w-full bg-blue-600 hover:bg-blue-700">
                  <Camera className="mr-2 h-4 w-4" />
                  Start Camera Scanner
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-64 h-64 mx-auto rounded-lg border-2 border-blue-300"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none">
                    <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-blue-500"></div>
                    <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-blue-500"></div>
                    <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-blue-500"></div>
                    <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-blue-500"></div>
                  </div>
                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center">
                      <div className="bg-white rounded-lg p-3 flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm">Processing...</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={stopCamera} variant="outline" className="flex-1 bg-transparent">
                    Stop Scanner
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Manual Entry */}
          <div className="border-t pt-4">
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <Label htmlFor="manual-token" className="text-sm font-medium">
                  Manual Token Entry
                </Label>
                <p className="text-xs text-gray-600 mb-2">If camera doesn't work, enter the token manually</p>
                <Input
                  id="manual-token"
                  type="text"
                  placeholder="Enter QR token here..."
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  disabled={isProcessing}
                />
              </div>
              <Button
                type="submit"
                disabled={!manualToken.trim() || isProcessing}
                className="w-full bg-transparent"
                variant="outline"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Smartphone className="mr-2 h-4 w-4" />
                    Submit Token
                  </>
                )}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Result Display */}
      {scanResult && (
        <Card className={`border-2 ${getResultColor()}`}>
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              {getResultIcon()}
              <div>
                <h3 className="font-semibold text-lg">{scanResult.success ? "Attendance Marked!" : "Scan Failed"}</h3>
                <p className="text-sm">{scanResult.message}</p>
                {scanResult.error && <p className="text-xs mt-1 opacity-75">{scanResult.error}</p>}
              </div>
              {scanResult.success && scanResult.status && (
                <Badge
                  variant="outline"
                  className={
                    scanResult.status === "present"
                      ? "bg-green-100 text-green-800 border-green-300"
                      : "bg-yellow-100 text-yellow-800 border-yellow-300"
                  }
                >
                  Marked as {scanResult.status}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-blue-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium text-sm">How to use:</span>
            </div>
            <ul className="text-sm text-blue-700 space-y-1 ml-6">
              <li>• Point your camera at the QR code on the teacher's screen</li>
              <li>• The code changes every 5 seconds for security</li>
              <li>
                • <span className="font-medium text-green-700">First 10 minutes: Marked as Present</span>
              </li>
              <li>
                • <span className="font-medium text-yellow-700">10-20 minutes: Marked as Late</span>
              </li>
              <li>
                • <span className="font-medium text-red-700">After 20 minutes: Attendance window closes</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
