import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get("classId")

    if (!classId) {
      return NextResponse.json({ error: "Class ID is required" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get attendance count for the class
    const { data, error } = await supabase
      .from("attendance_records")
      .select("id", { count: "exact" })
      .eq("class_id", classId)
      .in("status", ["present", "late"])

    if (error) {
      return NextResponse.json({ error: "Failed to get attendance count" }, { status: 500 })
    }

    return NextResponse.json({ count: data?.length || 0 })
  } catch (error) {
    console.error("Error getting attendance count:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
