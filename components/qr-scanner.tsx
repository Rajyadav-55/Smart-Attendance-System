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
  // Auto-refresh scanner every 15 seconds
  useEffect(() => {
    if (!isScanning) return;
    const refreshTimer = setTimeout(() => {
      stopCamera();
      setTimeout(() => startCamera(), 500); // Restart after short delay
    }, 15000);
    return () => clearTimeout(refreshTimer);
  }, [isScanning]);
  const [manualToken, setManualToken] = useState("")
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout>()

  // Start camera for QR scanning
  // Refactored: set scanning state, then start camera in useEffect after video is mounted
  const [shouldStartCamera, setShouldStartCamera] = useState(false)
  const startCamera = () => {
    setScanResult(null)
    setShouldStartCamera(true)
  }

  useEffect(() => {
    const runCamera = async () => {
      if (!shouldStartCamera || !videoRef.current) return
      try {
        console.log("[QRScanner] Start camera effect running")
        let facingMode: "user" | "environment" = "user"
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        )
        if (isMobile) {
          facingMode = "environment"
        }
        console.log(`[QRScanner] Requesting camera with facingMode: ${facingMode}`)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
        })
        console.log("[QRScanner] Camera stream received", stream)
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsScanning(true)
        console.log("[QRScanner] Video element updated with stream")
        scanIntervalRef.current = setInterval(scanQRCode, 500)
      } catch (error) {
        console.error("Error accessing camera:", error)
        setScanResult({
          success: false,
          error: "Unable to access camera. Please check permissions or use manual entry.",
          message: "Camera access denied",
        })
      }
    }
    runCamera()
    // Cleanup function
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
    }
  }, [shouldStartCamera])

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
    // Clear previous error after 2 seconds for better UX
    setTimeout(() => {
      setScanResult(null);
    }, 2000);

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
    <div className="max-w-md mx-auto space-y-8">
      {/* QR Scanner Card */}
      <Card className="bg-white/95 shadow-xl rounded-2xl border border-blue-100 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-blue-700">
            <QrCode className="h-6 w-6 text-blue-600" />
            QR Code Scanner
          </CardTitle>
          <CardDescription className="text-gray-500">Scan the QR code displayed by your teacher to mark attendance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Camera Scanner */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-72 h-72 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200 shadow-md flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover rounded-xl border-none"
                style={{ display: isScanning ? "block" : "none" }}
              />
              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Camera className="h-16 w-16 text-blue-300 mb-3" />
                  <p className="text-base text-blue-500 font-medium">Camera not active</p>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 border-4 border-blue-400 rounded-xl pointer-events-none">
                <div className="absolute top-2 left-2 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>
                <div className="absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>
                <div className="absolute bottom-2 left-2 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>
                <div className="absolute bottom-2 right-2 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>
              </div>
              {isProcessing && (
                <div className="absolute inset-0 bg-black/30 rounded-xl flex items-center justify-center">
                  <div className="bg-white rounded-lg p-4 flex items-center gap-3 shadow-lg">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="text-base font-semibold">Processing...</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 w-full">
              {!isScanning ? (
                <Button onClick={startCamera} className="w-full bg-blue-600 hover:bg-blue-700 text-base py-2 rounded-lg shadow">
                  <Camera className="mr-2 h-5 w-5" />
                  Start Camera Scanner
                </Button>
              ) : (
                <Button onClick={stopCamera} variant="outline" className="flex-1 bg-white text-blue-700 border-blue-300 py-2 rounded-lg shadow">
                  Stop Scanner
                </Button>
              )}
            </div>
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
              <li>• The code changes every 15 seconds for security</li>
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
