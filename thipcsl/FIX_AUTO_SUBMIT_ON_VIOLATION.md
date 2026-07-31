# Fix: Tự Động Nộp Bài Khi Vượt Quá Số Lần Vi Phạm

## 🐛 Vấn đề

**Scenario:**
1. Cấu hình `max_violations = 3`
2. Thí sinh vi phạm lần 1, 2, 3...
3. **BUG 1:** Bài thi bị khóa ngay từ lần vi phạm đầu tiên!
4. **BUG 2:** Khi vượt quá `max_violations`, bài thi chỉ bị khóa, KHÔNG tự động nộp bài
5. Thí sinh vẫn có thể tiếp tục làm bài (mặc dù bị khóa)

**Code cũ (dòng 189-204):**
```typescript
const handleViolation = (message: string) => {
    if (isLocked) return;

    const newCount = violationCount + 1;
    setViolationCount(newCount);
    localStorage.setItem(`exam_${id}_violations`, newCount.toString());

    const maxViolations = exam.max_violations || 3;

    if (newCount >= maxViolations) {
        alert(`Bạn đã vi phạm đến giới hạn quy định (${maxViolations} lần). Bài thi sẽ bị KHÓA. Vui lòng liên hệ giám thị.`);
        lockExam(); // ← Chỉ khóa, KHÔNG nộp bài
    } else {
        lockExam(); // ← BUG: Khóa ngay cả khi chưa vượt quá!
    }
};
```

**Vấn đề:**
1. **BUG 1:** `else { lockExam(); }` → Khóa ngay từ lần vi phạm đầu tiên
2. **BUG 2:** Khi `newCount >= maxViolations` → Chỉ khóa, không nộp bài
3. Thí sinh vẫn có thể làm bài (UI không bị block hoàn toàn)

---

## ✅ Giải pháp

### Code mới (dòng 189-207)

```typescript
const handleViolation = (message: string) => {
    if (isLocked) return;

    const newCount = violationCount + 1;
    setViolationCount(newCount);
    localStorage.setItem(`exam_${id}_violations`, newCount.toString());

    const maxViolations = exam.max_violations || 3;

    if (newCount >= maxViolations) {
        // Vượt quá giới hạn → Khóa VÀ tự động nộp bài
        alert(`Bạn đã vi phạm đến giới hạn quy định (${maxViolations} lần). Bài thi sẽ bị KHÓA và TỰ ĐỘNG NỘP BÀI.`);
        lockExam();
        // Tự động nộp bài sau khi khóa
        setTimeout(() => {
            handleSubmit();
        }, 1000); // Đợi 1 giây để lockExam() hoàn thành
    } else {
        // Chưa vượt quá → Chỉ cảnh báo, KHÔNG khóa
        alert(`${message}\nSố lần vi phạm: ${newCount}/${maxViolations}`);
    }
};
```

### Thay đổi chính

| Tình huống | Trước (BUG) | Sau (FIXED) |
|------------|-------------|-------------|
| **Vi phạm lần 1** | Khóa ngay ❌ | Cảnh báo "1/3" ✅ |
| **Vi phạm lần 2** | Khóa ngay ❌ | Cảnh báo "2/3" ✅ |
| **Vi phạm lần 3** | Khóa, không nộp ❌ | Khóa + Nộp bài ✅ |
| **Sau khi nộp** | Vẫn làm được ❌ | Redirect kết quả ✅ |

---

## 🎯 Kịch bản được fix

### Kịch bản 1: Vi phạm lần 1, 2 (chưa vượt quá)
- **Trước:** Bài thi bị khóa ngay ❌
- **Sau:** Hiển thị cảnh báo "Số lần vi phạm: 1/3", "2/3" ✅
- **Kết quả:** Thí sinh vẫn làm bài bình thường ✅

### Kịch bản 2: Vi phạm lần 3 (vượt quá max_violations = 3)
- **Trước:** 
  - Bài thi bị khóa ✅
  - Không tự động nộp bài ❌
  - Thí sinh vẫn có thể làm bài ❌
- **Sau:**
  - Bài thi bị khóa ✅
  - **Tự động nộp bài sau 1 giây** ✅
  - Redirect về trang kết quả ✅

### Kịch bản 3: Vi phạm lần 4, 5... (sau khi đã khóa)
- `if (isLocked) return;` → Không xử lý thêm ✅

---

## 🔄 Luồng hoạt động mới

```
Thí sinh vi phạm (thoát fullscreen, chuyển tab...)
    ↓
handleViolation(message)
    ↓
isLocked?
    ├─ YES → Return (không xử lý)
    └─ NO → Tiếp tục
        ↓
    newCount = violationCount + 1
    setViolationCount(newCount)
    localStorage.setItem(...)
        ↓
    newCount >= maxViolations?
        ├─ YES (Vượt quá)
        │   ├─ Alert: "Bài thi sẽ bị KHÓA và TỰ ĐỘNG NỘP BÀI"
        │   ├─ lockExam() → Gọi API /api/exam-runner/lock
        │   └─ setTimeout(() => handleSubmit(), 1000)
        │       ├─ Gọi API POST /api/exam-runner/[id]
        │       ├─ Chấm điểm
        │       ├─ Lưu kết quả
        │       └─ Redirect /exam/results/[resultId]
        │
        └─ NO (Chưa vượt quá)
            └─ Alert: "Số lần vi phạm: {newCount}/{maxViolations}"
```

---

## 📊 So sánh

| Vi phạm | max_violations | Trước | Sau |
|---------|----------------|-------|-----|
| **Lần 1** | 3 | Khóa ❌ | Cảnh báo "1/3" ✅ |
| **Lần 2** | 3 | Khóa ❌ | Cảnh báo "2/3" ✅ |
| **Lần 3** | 3 | Khóa, không nộp ❌ | Khóa + Nộp bài ✅ |
| **Lần 4+** | 3 | Vẫn làm được ❌ | Đã nộp, redirect ✅ |

---

## ⚠️ Lưu ý

### Thời gian delay
```typescript
setTimeout(() => {
    handleSubmit();
}, 1000); // 1 giây
```

**Lý do:**
- Đợi `lockExam()` hoàn thành (gọi API `/api/exam-runner/lock`)
- Đảm bảo `is_locked = true` được lưu vào database trước khi nộp bài
- 1 giây là đủ cho hầu hết các trường hợp

### Thông báo rõ ràng
- **Trước:** "Bài thi sẽ bị KHÓA. Vui lòng liên hệ giám thị."
- **Sau:** "Bài thi sẽ bị KHÓA và TỰ ĐỘNG NỘP BÀI."
- Thí sinh biết rõ bài thi sẽ được nộp tự động

### Không khóa khi chưa vượt quá
- **Trước:** `else { lockExam(); }` → Khóa ngay lần đầu
- **Sau:** `else { alert(...); }` → Chỉ cảnh báo
- Cho phép thí sinh tiếp tục làm bài nếu chưa vượt quá

---

## 📋 Checklist

- ✅ Không khóa bài thi khi chưa vượt quá max_violations
- ✅ Hiển thị cảnh báo "Số lần vi phạm: X/Y"
- ✅ Tự động nộp bài khi vượt quá max_violations
- ✅ Khóa bài thi trước khi nộp
- ✅ Redirect về trang kết quả sau khi nộp
- ✅ Không xử lý thêm nếu đã khóa

---

## 🧪 Test

### Test Case 1: Vi phạm chưa vượt quá
1. Cấu hình `max_violations = 3`
2. Thoát fullscreen lần 1
3. **Expected:** Alert "Số lần vi phạm: 1/3", vẫn làm bài được ✅
4. Thoát fullscreen lần 2
5. **Expected:** Alert "Số lần vi phạm: 2/3", vẫn làm bài được ✅

### Test Case 2: Vi phạm vượt quá
1. Thoát fullscreen lần 3
2. **Expected:** 
   - Alert "Bài thi sẽ bị KHÓA và TỰ ĐỘNG NỘP BÀI" ✅
   - Sau 1 giây: Nộp bài tự động ✅
   - Redirect về `/exam/results/[id]` ✅

### Test Case 3: Vi phạm sau khi đã khóa
1. Sau khi nộp bài, thí sinh vẫn cố thoát fullscreen
2. **Expected:** Không có gì xảy ra (`if (isLocked) return`) ✅

---

## 📄 Files đã sửa

1. ✅ `app/exam/[id]/page.tsx` - Logic xử lý vi phạm
2. ✅ `FIX_AUTO_SUBMIT_ON_VIOLATION.md` - Tài liệu này

---

## 🎯 Kết quả

**Trước:**
- Vi phạm lần 1 → Khóa ngay ❌
- Vi phạm lần 3 → Khóa, nhưng vẫn làm được ❌

**Sau:**
- Vi phạm lần 1, 2 → Cảnh báo, vẫn làm được ✅
- Vi phạm lần 3 → Khóa + Tự động nộp bài ✅
- Redirect về kết quả ✅

**Hệ thống giờ đã hoạt động đúng theo quy định!** 🎉
