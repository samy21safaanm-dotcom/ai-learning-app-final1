# 🏆 دليل النقل - يوم الهاكاثون
## لشخص مبتدئ — خطوة بخطوة

---

## 📌 فهم مشروعك أولاً (مهم جداً)

مشروعك يعتمد على 4 خدمات AWS:
| الخدمة | الاستخدام |
|--------|-----------|
| **EC2** (54.224.54.16) | السيرفر الذي يشغّل التطبيق |
| **RDS** | قاعدة البيانات PostgreSQL |
| **S3** | تخزين الملفات المرفوعة |
| **Bedrock/AI** | توليد الدروس بالذكاء الاصطناعي |

> ⚠️ **ملاحظة مهمة:** إذا أعطوك سيرفر AWS → استخدم الجزء الأول.
> إذا أعطوك سيرفر غير AWS (Ubuntu عادي) → استخدم الجزء الثاني.

---

# الجزء صفر: الآن (قبل الهاكاثون) — إنشاء النسخة الذهبية Golden AMI

هذه نسخة احتياطية كاملة من سيرفرك الحالي. تعمل كـ "USB يحتوي على كل شيء".

## الخطوات (تفعلها الآن مرة واحدة فقط)

### الخطوة 1: افتح AWS Console

1. افتح المتصفح واذهب إلى: https://console.aws.amazon.com
2. سجّل دخول بحسابك
3. تأكد أنك في منطقة **us-east-1 (N. Virginia)** — انظر أعلى يمين الشاشة

### الخطوة 2: اذهب لصفحة EC2

1. في شريط البحث العلوي اكتب: `EC2`
2. انقر على **EC2**
3. من القائمة اليسرى انقر على **Instances**
4. ستجد سيرفرك (IP: 54.224.54.16) — انقر عليه مرة واحدة لتحديده

### الخطوة 3: إنشاء الصورة الذهبية (AMI)

1. انقر على زر **Actions** (أعلى الصفحة)
2. اختر **Image and templates**
3. اختر **Create image**
4. املأ الحقول:
   - **Image name:** `ai-learning-golden-v1`
   - **Image description:** `Golden image before hackathon - May 2026`
   - باقي الإعدادات: اتركها كما هي
5. انقر **Create image**
6. ستظهر رسالة نجاح — **احفظ الـ AMI ID** (يبدأ بـ `ami-`)

### الخطوة 4: انتظر اكتمال الصورة

1. من القائمة اليسرى انقر **AMIs** (تحت "Images")
2. ابحث عن `ai-learning-golden-v1`
3. انتظر حتى تتغير الحالة من `pending` إلى ✅ `available`
4. (يستغرق 5-10 دقائق)

### الخطوة 5: احفظ معلومات السيرفر الحالي

افتح PowerShell على جهازك واكتب:

```powershell
# اتصل بسيرفرك الحالي واسحب المعلومات المهمة
ssh -i <مسار_مفتاح.pem> ubuntu@54.224.54.16 "cat /opt/app/backend/.env"
```

**احفظ هذه المعلومات في ورقة أو ملف نصي:**
- `S3_BUCKET_NAME=` (اسم bucket الـ S3)
- `DB_HOST=` (عنوان قاعدة البيانات)
- `AWS_REGION=us-east-1`
- `BEDROCK_MODEL_ID=`

---

# الجزء الأول: يوم الهاكاثون — السيرفر الجديد هو EC2 على AWS

## قبل البدء: احصل على هذه المعلومات من منظمي الهاكاثون

- [ ] IP السيرفر الجديد (مثال: `3.90.XX.XX`)
- [ ] ملف المفتاح `.pem` للاتصال
- [ ] هل هو في نفس حساب AWS؟ أم حساب مختلف؟

---

## السيناريو الأسهل: نفس حساب AWS — إطلاق من الصورة الذهبية

### الخطوة 1: اذهب لـ AMIs في AWS Console

1. EC2 → **AMIs** (من القائمة اليسرى)
2. انقر على `ai-learning-golden-v1`
3. انقر **Launch instance from AMI**

### الخطوة 2: إعدادات الـ Instance الجديدة

1. **Name:** `ai-learning-hackathon`
2. **Instance type:** `t3.small` (أو ما يوفره المنظمون)
3. **Key pair:** اختر مفتاحك الموجود أو أنشئ جديد
4. **Security group:** تأكد من فتح هذه المنافذ:
   - Port 80 (HTTP) — من أي مكان
   - Port 22 (SSH) — من أي مكان (للهاكاثون فقط)
5. **IAM instance profile:** اختر `AiLearningStack/Ec2Role` (نفس دور السيرفر القديم)
6. انقر **Launch instance**

### الخطوة 3: تحديث عنوان IP في التطبيق

```powershell
# اتصل بالسيرفر الجديد
ssh -i <مفتاح.pem> ubuntu@<NEW_IP>

# تحديث PUBLIC_BASE_URL
sudo sed -i "s|PUBLIC_BASE_URL=.*|PUBLIC_BASE_URL=http://<NEW_IP>|" /opt/app/backend/.env

# إعادة تشغيل التطبيق
pm2 restart ai-learning-backend
sudo systemctl reload nginx
```

### الخطوة 4: تحقق ✅

```powershell
curl http://<NEW_IP>/health
```
يجب أن يرجع: `{"status":"healthy"}`

---

## السيناريو الثاني: حساب AWS مختلف

### الخطوة 1: مشاركة الصورة الذهبية مع حسابهم

1. AWS Console → EC2 → AMIs
2. انقر على `ai-learning-golden-v1`
3. انقر **Actions** → **Edit AMI permissions**
4. في **AWS account ID** أضف رقم حساب AWS الخاص بالمنظمين
5. انقر **Save changes**

### الخطوة 2: باقي الخطوات نفس السيناريو الأول

في حساب المنظمين: EC2 → AMIs → **Shared with me** → ابحث عن الصورة

---

# الجزء الثاني: يوم الهاكاثون — السيرفر الجديد Ubuntu عادي (غير AWS)

> هذا الوضع يحتاج استخدام AWS credentials صريحة لأن السيرفر الجديد ليس له IAM Role تلقائي.

## قبل البدء: ستحتاج

- [ ] IP السيرفر الجديد
- [ ] مفتاح SSH للاتصال (`.pem` أو كلمة مرور)
- [ ] **AWS Access Key** لحسابك (نشرحها أدناه)

---

## الخطوة صفر: احصل على AWS Access Keys (افعل هذا الآن قبل الهاكاثون)

1. AWS Console → انقر اسمك أعلى اليمين → **Security credentials**
2. انزل لـ **Access keys** → انقر **Create access key**
3. اختر **Other** → انقر **Next** → **Create access key**
4. **احفظ الـ Access Key ID والـ Secret** في مكان آمن — لن تراهما مرة أخرى!
5. احفظهما في ملف نصي مشفر أو ورقة معك يوم الهاكاثون

---

## التنفيذ يوم الهاكاثون (15 دقيقة)

### الدقيقة 0-2: الاتصال بالسيرفر الجديد

```powershell
# من PowerShell على جهازك
ssh -i <مفتاح.pem> ubuntu@<NEW_SERVER_IP>
```

أو إذا كانوا يعطونك كلمة مرور:
```powershell
ssh ubuntu@<NEW_SERVER_IP>
# ثم أدخل كلمة المرور
```

### الدقيقة 2-5: تثبيت المتطلبات على السيرفر الجديد

انسخ هذا كله ولصقه **دفعة واحدة** في terminal السيرفر:

```bash
# تثبيت Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# تثبيت PM2 و Nginx
sudo npm install -g pm2
sudo apt-get install -y nginx

# إنشاء مجلد التطبيق
sudo mkdir -p /opt/app
sudo chown ubuntu:ubuntu /opt/app

echo "✅ تثبيت المتطلبات اكتمل"
```

### الدقيقة 5-9: نسخ ملفات المشروع من سيرفرك الحالي

**على جهازك المحلي (PowerShell)** — افتح نافذة جديدة:

```powershell
# أولاً: اسحب الكود من سيرفرك القديم إلى جهازك
cd d:\ai-learning-app

# ثم انشر على السيرفر الجديد
bash scripts/first-deploy.sh <NEW_SERVER_IP> <مسار_المفتاح.pem>
```

> **ملاحظة:** سكريبت `first-deploy.sh` يحتاج متغيرات. انظر الخطوة التالية.

### الدقيقة 5-9: (البديل الأسرع) — إعداد المتغيرات ثم النشر

في PowerShell على جهازك:

```powershell
# ضع قيمك الحقيقية هنا (من الورقة التي حفظتها)
$env:AWS_REGION = "us-east-1"
$env:S3_BUCKET_NAME = "ai-learning-files-<ACCOUNT_ID>"    # من ورقتك
$env:DB_HOST = "<RDS_ENDPOINT>"                           # من ورقتك
$env:PUBLIC_BASE_URL = "http://<NEW_SERVER_IP>"
$env:AWS_ACCESS_KEY_ID = "<ACCESS_KEY_ID>"                # من ورقتك
$env:AWS_SECRET_ACCESS_KEY = "<SECRET_ACCESS_KEY>"        # من ورقتك

# الآن شغّل النشر
bash scripts/first-deploy.sh <NEW_SERVER_IP> <مسار_المفتاح.pem>
```

### الدقيقة 9-11: إضافة AWS Credentials على السيرفر الجديد

```bash
# على السيرفر الجديد — أضف credentials للـ .env
cat >> /opt/app/backend/.env << EOF
AWS_ACCESS_KEY_ID=<ACCESS_KEY_ID>
AWS_SECRET_ACCESS_KEY=<SECRET_ACCESS_KEY>
EOF

# أعد تشغيل التطبيق
pm2 restart ai-learning-backend
```

### الدقيقة 11-13: إعداد Nginx

```bash
# على السيرفر الجديد
sudo tee /etc/nginx/sites-available/default > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;

    # Frontend
    root /opt/app/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:4000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Direct backend routes
    location ~ ^/(health|upload|files|lesson|generate|translate|media|auth) {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

sudo nginx -t && sudo systemctl restart nginx
echo "✅ Nginx جاهز"
```

---

# ✅ Checkpoints — نقاط التحقق قبل العرض

## Checkpoint 1: التطبيق يعمل
```powershell
curl http://<NEW_SERVER_IP>/health
```
**النتيجة المطلوبة:** `{"status":"healthy"}` أو `{"status":"degraded"}`
❌ إذا فشل: `pm2 logs ai-learning-backend --lines 20` وانظر الخطأ

## Checkpoint 2: قاعدة البيانات تعمل
افتح المتصفح: `http://<NEW_SERVER_IP>`
- يجب أن تظهر صفحة تسجيل الدخول بدون أخطاء

## Checkpoint 3: الرفع يعمل
- سجّل دخول
- ارفع ملف PDF صغير
- يجب أن يظهر في القائمة

## Checkpoint 4: توليد الدرس يعمل
- انقر على الملف المرفوع
- انقر "توليد درس"
- انتظر 30-60 ثانية — يجب أن يظهر الدرس

## ✅ Checkpoint نهائي: كل شيء يعمل
```
[ ] صفحة الدخول تظهر ✓
[ ] رفع ملف يعمل ✓
[ ] توليد درس يعمل ✓
[ ] عرض الدرس يعمل ✓
```

---

# 🚨 إذا حدث خطأ — Rollback في 2 دقيقة

## العودة للسيرفر القديم فوراً

**للمنظمين:** "نعتذر، سنعرض على السيرفر الاحتياطي"

افتح المتصفح على: **http://54.224.54.16**

تأكد أنه يعمل:
```powershell
curl http://54.224.54.16/health
```

> السيرفر القديم لم يُغلق — هو جاهز دائماً كخطة B

---

# 📋 ورقة الغش — خذها معك يوم الهاكاثون

```
=== معلومات مشروعي ===
السيرفر الحالي:      http://54.224.54.16
AWS Region:          us-east-1
S3 Bucket:           ai-learning-files-<ACCOUNT_ID>
RDS Host:            <RDS_ENDPOINT>
DB Name:             ailearning
DB Port:             5432
Bedrock Model:       amazon.nova-lite-v1:0

=== أوامر سريعة ===
اتصل بالسيرفر:       ssh -i <key.pem> ubuntu@<IP>
حالة التطبيق:        pm2 status
إعادة تشغيل:         pm2 restart ai-learning-backend
سجل الأخطاء:         pm2 logs ai-learning-backend --lines 50
تحقق من الـ .env:    cat /opt/app/backend/.env
إعادة nginx:         sudo systemctl restart nginx

=== نقاط التحقق ===
1. curl http://<NEW_IP>/health → {"status":"healthy"}
2. فتح الموقع في المتصفح
3. رفع ملف PDF صغير
4. توليد درس
5. عرض الدرس
```

---

# ❓ أسئلة شائعة

**س: ماذا لو قالوا لا يمكن استخدام AWS؟**
ج: هذا نادر جداً. لكن إذا حدث، التطبيق يحتاج تعديل كبير — تواصل معي مسبقاً.

**س: هل يجب إيقاف السيرفر القديم؟**
ج: لا! ابقه شغالاً كخطة احتياطية طوال الهاكاثون.

**س: ماذا لو نسيت مفتاح الـ .pem؟**
ج: لا يمكن الوصول للسيرفر بدونه. احفظه في Google Drive أيضاً.

**س: ما اسم مفتاحي الحالي وأين هو؟**
ج: ابحث على جهازك عن ملفات `.pem` أو في `~/.ssh/`
