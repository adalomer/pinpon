# 🏓 3D Ping Pong Pro

3D masa tenisi oyunu - Three.js ile geliştirildi.

## 📁 Dosya Yapısı

```
pinpon/
├── index.html              # Tek dosyalı versiyon
├── index-modular.html      # Modüler versiyon (yeni)
├── README.md               # Bu dosya
│
├── css/
│   └── style.css           # 🎨 Tüm stiller
│
└── js/
    ├── main.js             # 🚀 Giriş noktası
    ├── config.js           # ⚙️ Oyun sabitleri (masa, fizik)
    ├── game.js             # 🎮 Ana oyun mantığı
    ├── scene.js            # 🌍 Three.js sahne kurulumu
    ├── table.js            # 🏓 Masa ve file
    ├── ball.js             # ⚽ Top fiziği
    ├── paddle.js           # 🏸 Raket kontrolü
    ├── input.js            # 🖱️ Mouse/klavye
    ├── sound.js            # 🔊 Ses efektleri
    └── ui.js               # 📊 Kullanıcı arayüzü
```

## 📦 Modül Açıklamaları

### `config.js` - Oyun Sabitleri
- `TABLE` - Masa boyutları (2.74m x 1.525m x 0.76m - gerçek ölçüler)
- `PHYSICS` - Fizik parametreleri (yerçekimi, sekme, spin etkisi)
- `GAME_SETTINGS` - Oyun kuralları (11 sayı kazanır)

### `scene.js` - 3D Sahne Kurulumu
- `createScene()` - Sahne, kamera, renderer oluşturma
- `createEnvironment()` - Zemin ve arka duvar
- `setupLights()` - Işıklandırma
- `handleResize()` - Pencere boyutlandırma

### `table.js` - Masa ve File
- `createTable()` - Masa üstü, beyaz çizgiler, bacaklar
- `createNet()` - File ağı, direkler, üst çubuk

### `ball.js` - Top Fiziği
- `createBall()` - Top mesh'i oluşturma
- `updateBall()` - Fizik güncelleme
  - Yerçekimi ve hava direnci
  - Magnus etkisi (spin/falso)
  - Masa sekmesi
  - File çarpması
  - Raket çarpışması
- `checkOutOfBounds()` - Sınır dışı kontrolü

### `paddle.js` - Raket Kontrolü
- `createPaddles()` - Oyuncu ve rakip raketleri
- `updatePlayerPaddle()` - Mouse takibi ve eğim
- `updateOpponentAI()` - Bot yapay zekası

### `input.js` - Girdi Yönetimi
- Mouse hareket ve tıklama
- Klavye (SPACE servis, ESC pause)
- Touch desteği (mobil)
- Custom cursor efekti

### `sound.js` - Ses Sistemi
- `initAudio()` - Web Audio API başlatma
- `playSound()` - Frekans bazlı ses
- `SOUNDS` - Önceden tanımlı efektler (hit, bounce, score...)

### `ui.js` - Kullanıcı Arayüzü
- Menü göster/gizle
- Skor güncellemesi
- Mesaj gösterimi
- Pause ekranı

### `game.js` - Ana Oyun Mantığı
- Oyun durumu yönetimi (menu, serving, playing, paused, ended)
- Servis sistemi (önce kendi saha, sonra rakip)
- Skor sistemi (11 sayı, 2 fark)
- Animation döngüsü

### `main.js` - Giriş Noktası
- Oyunu başlatır

## 🎮 Kontroller

| Kontrol | Açıklama |
|---------|----------|
| 🖱️ Mouse Hareketi | Raket kontrolü |
| ⬅️ Sola çekerek vur | Sağa falso |
| ➡️ Sağa çekerek vur | Sola falso |
| ⬆️ Yukarı çekerek | Topspin |
| ⬇️ Aşağı çekerek | Backspin |
| SPACE / Click | Servis başlat |
| ESC | Duraklat |

## 🏆 Oyun Kuralları

- **11 sayıya** ilk ulaşan kazanır
- En az **2 sayı fark** olmalı
- Servis önce **kendi sahana** sekip sonra rakibe geçmeli
- Her tarafta **tek sekme** hakkı (2. sekme = sayı kaybı)

## 🚀 Çalıştırma

### Modüler Versiyon (Önerilen)
```bash
cd pinpon
python3 -m http.server 5500
# Tarayıcıda: http://localhost:5500/index-modular.html
```

### Tek Dosya Versiyonu
```bash
cd pinpon
python3 -m http.server 5500
# Tarayıcıda: http://localhost:5500/index.html
```

## 🛠️ Teknolojiler

- **Three.js** r160 - 3D rendering (ES Modules)
- **Web Audio API** - Ses efektleri
- **ES Modules** - Modüler JavaScript

## 📜 Lisans

MIT License

---

🎾 İyi oyunlar!
