# Runbook مختصر لنقل السيرفر (10-15 دقيقة)

## الهدف
- نقل التطبيق من السيرفر القديم إلى السيرفر الجديد بسرعة يوم الهاكاثون، مع نقاط تحقق واضحة قبل العرض.

## قبل نافذة النقل (T-30 إلى T-10)
1. من جهازك المحلي جهّز المتغيرات (مرة واحدة):
```bash
export AWS_REGION=us-east-1
export S3_BUCKET_NAME=<exact-bucket-name>
export DB_HOST=<rds-endpoint>
export PUBLIC_BASE_URL=http://<NEW_SERVER_IP>
```
2. تأكد أن SSH يعمل على السيرفر الجديد:
```bash
ssh -i <key.pem> ubuntu@<NEW_SERVER_IP> "echo ok"
```
3. تأكد أن DNS/Load Balancer TTL منخفض (60 ثانية) قبل الحدث بوقت كاف.

## التنفيذ أثناء نافذة النقل (10-15 دقيقة)

### الدقيقة 0-6: نشر على السيرفر الجديد
1. شغّل أول نشر:
```bash
bash scripts/first-deploy.sh <NEW_SERVER_IP> <PATH_TO_KEY.pem>
```
2. Checkpoint A (لا تنتقل قبل النجاح):
```bash
curl -s http://<NEW_SERVER_IP>/health
curl -s http://<NEW_SERVER_IP>/media-provider-status
```
النجاح المطلوب:
- `/health` يرجع `status: healthy` أو `status: degraded` (مقبول للعرض بسبب fallback).
- `/media-provider-status` يرجع JSON صحيح.

### الدقيقة 6-10: اختبار سيناريو العرض
1. افتح التطبيق على السيرفر الجديد:
```bash
http://<NEW_SERVER_IP>
```
2. نفّذ تجربة عرض كاملة سريعة:
- تسجيل دخول.
- رفع ملف.
- توليد درس.
- فتح الدرس والتأكد من ظهور المحتوى.
3. Checkpoint B:
- الصفحة الرئيسية تعمل.
- الرفع يعمل.
- التوليد يعمل (حتى لو fallback).

### الدقيقة 10-12: التحويل الرسمي
1. حوّل الترافيك للسيرفر الجديد (DNS A record أو Target Group).
2. انتظر انتشار 1-3 دقائق.
3. Checkpoint C (نهائي قبل الصعود للمسرح):
```bash
curl -I http://<YOUR_DOMAIN>
curl -s http://<YOUR_DOMAIN>/health
```

## Rollback سريع (2-3 دقائق)
1. أعد DNS/Target Group إلى السيرفر القديم فورًا.
2. تحقق:
```bash
curl -s http://<YOUR_DOMAIN>/health
```
3. استكمل العرض على السيرفر القديم بدون انتظار إصلاح الجديد.

## قائمة جاهزية دقيقة قبل العرض
- Checkpoint A ناجح.
- Checkpoint B ناجح.
- Checkpoint C ناجح.
- رابط بديل جاهز: `http://<OLD_SERVER_IP>`.
- ملف المفتاح `pem` وجلسة SSH مفتوحة مسبقًا.

