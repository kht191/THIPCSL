# Fix: Cho Phép Làm Bài Nhiều Lần

## 🐛 Vấn đề

**Scenario:**
- Cấu hình `max_attempts = 10` (cho phép thi 10 lần)
- Lần 1: Làm bài và nộp ✅
- Lần 2: Vào thi lại → ❌ BUG: Bị reject với message "Bài thi đã được nộp. Phiên làm việc của bạn đã kết thúc."

**Nguyên nhân:**
Logic kiểm tra session conflict **quá strict**:
```typescript
// OLD: Reject trong 5 phút
const recentResult = existingResults.find(r =>
    r.session_token === providedToken &&
    r.status === 'COMPLETED' &&
    (new Date().getTime() - new Date(r.submitted_at).getTime() < 5 * 60 * 1000) // 5 minutes!
);

if (recentResult) {
    return NextResponse.json({ error: 'Bài thi đã được nộp...' }, { status: 403 });
}
```

**Vấn đề:**
- Lần 1 nộp bài → `session_token: tokenA`
- Lần 2 vào thi (sau 2 phút) → Client vẫn gửi `tokenA`
- Server tìm thấy Result COMPLETED với `tokenA` trong vòng 5 phút → **REJECT!**
- Không cho phép làm lần 2, 3, 4... dù `max_attempts = 10`

---

## ✅ Giải pháp

### Thay đổi thời gian kiểm tra

| Case | Mục đích | Trước | Sau |
|------|----------|-------|-----|
| **CASE 1: Same token** | Ngăn double-submit | 5 phút | **1 phút** ✅ |
| **CASE 2: Different token** | Ngăn session takeover | 5 phút | **2 phút** ✅ |

### Code mới (dòng 115-156)

```typescript
} else {
    const { searchParams } = new URL(request.url);
    const providedToken = searchParams.get('sessionToken');

    if (providedToken && existingResults.length > 0) {
        // CASE 1: Check if this EXACT token was just completed (prevent double-submit)
        // Only reject if completed within last 1 minute (not 5 minutes)
        const justCompletedResult = existingResults.find(r =>
            r.session_token === providedToken &&
            r.status === 'COMPLETED' &&
            (new Date().getTime() - new Date(r.submitted_at).getTime() < 1 * 60 * 1000) // 1 minute
        );

        if (justCompletedResult) {
            // This session was JUST completed - prevent double-submit or immediate F5
            return NextResponse.json({
                error: 'Bài thi đã được nộp. Phiên làm việc của bạn đã kết thúc.',
                submitted: true,
                resultId: justCompletedResult.id
            }, { status: 403 });
        }

        // CASE 2: Check for session takeover (different token completed recently)
        // Only check within 2 minutes to allow retakes after that
        const recentTakeoverResult = existingResults.find(r =>
            r.session_token !== providedToken &&
            r.status === 'COMPLETED' &&
            (new Date().getTime() - new Date(r.submitted_at).getTime() < 2 * 60 * 1000) // 2 minutes
        );

        if (recentTakeoverResult) {
            // Another session took over and completed the exam recently
            return NextResponse.json({
                error: 'Phiên làm việc của bạn đã bị gián đoạn bởi một phiên đăng nhập khác và bài thi đã được nộp.',
                submitted: true,
                resultId: recentTakeoverResult.id
            }, { status: 403 });
        }
    }
    // If no recent conflicts, proceed to create new exam (for retakes)
}
```

---

## 🎯 Kịch bản được fix

### Kịch bản 1: Ngăn double-submit (< 1 phút)
- Lần 1: Nộp bài → `token: tokenA`
- **Ngay sau đó (< 1 phút):** F5 với `tokenA`
- **Result:** ❌ Reject - "Bài thi đã được nộp" ✅

### Kịch bản 2: Cho phép làm lại (> 1 phút)
- Lần 1: Nộp bài → `token: tokenA`
- **Sau 1 phút:** Vào thi lại với `tokenA`
- **Result:** ✅ Cho phép tạo bài mới (lần 2) ✅

### Kịch bản 3: Ngăn session takeover (< 2 phút)
- Máy A: Đang thi với `tokenA`
- Máy B: Takeover và nộp bài với `tokenB`
- **Máy A F5 (< 2 phút):** với `tokenA`
- **Result:** ❌ Reject - "Phiên bị gián đoạn" ✅

### Kịch bản 4: Cho phép làm nhiều lần
- Lần 1: Nộp bài (sau > 1 phút)
- Lần 2: Nộp bài (sau > 1 phút)
- Lần 3: Nộp bài (sau > 1 phút)
- ...
- Lần 10: Nộp bài ✅
- Lần 11: ❌ Reject - "Đã hết số lần làm bài"

---

## 🧪 Test

Chạy test script:
```bash
npx tsx test-multiple-attempts.ts
```

**Kết quả:**
```
✅ CORRECT: Rejected (prevent double-submit)
   → Message: "Bài thi đã được nộp. Phiên làm việc của bạn đã kết thúc."

✅ CORRECT: Not rejected (allow retake)
   → completedCount: 1/10
   → Can create new exam for attempt 2

✅ SUCCESS: Can continue to attempt 3, 4, 5... up to 10
```

---

## 📊 So sánh

| Tình huống | Trước (BUG) | Sau (FIXED) |
|------------|-------------|-------------|
| **Nộp bài lần 1** | OK ✅ | OK ✅ |
| **F5 ngay sau nộp (< 1 phút)** | Reject ✅ | Reject ✅ |
| **Vào thi lần 2 (> 1 phút)** | Reject ❌ | Cho phép ✅ |
| **Làm lần 3, 4, 5...** | Không thể ❌ | Cho phép ✅ |
| **Session takeover (< 2 phút)** | Reject ✅ | Reject ✅ |
| **Vượt max_attempts** | Reject ✅ | Reject ✅ |

---

## ⚠️ Lưu ý

### Thời gian kiểm tra

| Thời gian | Mục đích |
|-----------|----------|
| **< 1 phút** | Ngăn double-submit (CASE 1) |
| **< 2 phút** | Ngăn session takeover (CASE 2) |
| **> 2 phút** | Cho phép làm bài mới |

### Tại sao 1 phút và 2 phút?

- **1 phút:** Đủ để ngăn thí sinh F5 ngay sau khi nộp bài (double-submit)
- **2 phút:** Đủ để ngăn session takeover, nhưng không quá lâu để block retake
- **Có thể điều chỉnh:** Nếu cần, có thể thay đổi `1 * 60 * 1000` và `2 * 60 * 1000`

### LocalStorage Cleanup

Frontend vẫn cần xóa localStorage khi `startedAt = undefined` (đã fix ở commit trước):
```typescript
if (!data.startedAt) {
    localStorage.removeItem(`exam_${id}_endTime`);
    localStorage.removeItem(`exam_${id}_answers`);
    localStorage.removeItem(`exam_${id}_violations`);
}
```

---

## 📋 Checklist

- ✅ Ngăn double-submit (< 1 phút)
- ✅ Cho phép làm lại (> 1 phút)
- ✅ Ngăn session takeover (< 2 phút)
- ✅ Cho phép làm nhiều lần (lên đến max_attempts)
- ✅ Không ảnh hưởng logic khác
- ✅ Test script verify logic

---

## 🔄 Luồng hoạt động mới

```
Client GET /api/exam-runner/[id]?sessionToken=xxx
    ↓
Tìm IN_PROGRESS result?
    ├─ YES → Trả về bài thi đang làm
    └─ NO → Kiểm tra sessionToken
        ├─ CASE 1: Same token + COMPLETED < 1 phút?
        │   └─ YES → Reject (double-submit)
        ├─ CASE 2: Different token + COMPLETED < 2 phút?
        │   └─ YES → Reject (session takeover)
        └─ Kiểm tra max_attempts
            ├─ Đã hết lượt → Reject
            └─ Còn lượt → Tạo bài mới ✅
```

---

## 📄 Files đã sửa

1. ✅ `app/api/exam-runner/[id]/route.ts` - Giảm thời gian kiểm tra
2. ✅ `test-multiple-attempts.ts` - Test script
3. ✅ `FIX_MULTIPLE_ATTEMPTS.md` - Tài liệu này
