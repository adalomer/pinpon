# 🏓 3D Ping Pong - Masa Tenisi

Gerçek 3D masa tenisi oyunu! Three.js ile geliştirilmiş, fizik tabanlı falso sistemi, gerçekçi masa ve file, online multiplayer desteği.

## 🎮 Özellikler

### 3D Oyun Dünyası
- **Gerçekçi Masa**: Yeşil masa, beyaz çizgiler, ayaklar
- **File**: Direkleri ve ağı ile gerçekçi file
- **Raket**: Kırmızı ve siyah kauçuk yüzeyli raket
- **Top**: Parıltılı, spin göstergeli top
- **Ortam**: Neon ışıklar, grid zemin, yıldızlar

### Fizik Sistemi
- **Magnus Etkisi**: Spin'li toplar eğrilir
- **Topspin** 🟠: Raketi ileri iterek vur → Top aşağı eğrilir
- **Backspin** 🟢: Raketi geri çekerek vur → Top yukarı eğrilir
- **Sidespin** 🟡: Raketi yana iterek vur → Top yana eğrilir
- **Yerçekimi & Hava Direnci**: Gerçekçi top fiziği

### Kamera Sistemi
- Fare ile raket kontrolü
- Kamera raketi ve topu takip eder
- Sağa-sola hareket ettikçe kamera kayar

### Oyun Modları
- **🌐 Online**: 4 haneli kod ile arkadaşlarla
- **🤖 Bot**: Yapay zeka rakip
- **🎯 Antrenman**: Kolay mod pratik

## 🚀 Nasıl Oynanır

### Başlatma
```bash
# 3D versiyonu tarayıcıda aç
# index-3d.html dosyasını tarayıcıda aç

# VEYA 2D versiyonu için
# index.html dosyasını aç
```

### Kontroller

| Kontrol | İşlev |
|---------|-------|
| **Fare Hareketi** | Raketi kontrol et |
| **Hızlı İleri İtme** | Topspin (top aşağı eğrilir) |
| **Hızlı Geri Çekme** | Backspin (top yukarı eğrilir) |
| **Hızlı Sağa/Sola** | Sidespin (top yana eğrilir) |
| **ESC** | Oyunu duraklat |

## 🏆 Falso Nasıl Atılır?

### Topspin (Turuncu Parıltı 🟠)
```
1. Topun geleceğini hesapla
2. Raketi hızlıca İLERİ doğru hareket ettir
3. Topa vur
4. Top masa üzerinde aşağı doğru eğrilecek
→ Rakip için zor yakalanır!
```

### Backspin (Yeşil Parıltı 🟢)
```
1. Topun geleceğini hesapla  
2. Raketi hızlıca GERİ doğru çek
3. Topa vur
4. Top havada yukarı doğru eğrilecek
→ Yavaşlar ve kısa düşer!
```

### Sidespin (Sarı Parıltı 🟡)
```
1. Topun geleceğini hesapla
2. Raketi hızlıca SAĞA veya SOLA hareket ettir
3. Topa vur
4. Top yana doğru eğrilecek
→ Rakibi yanıltır!
```

## 📁 Dosya Yapısı

```
pinpon/
├── index-3d.html   # 3D Oyun (Three.js)
├── game-3d.js      # 3D Oyun Motoru
├── index.html      # 2D Oyun (Canvas)
├── game-v2.js      # 2D Oyun Motoru
├── server.js       # Socket.io Sunucusu (opsiyonel)
├── package.json    # Node.js bağımlılıkları
└── README.md       # Bu dosya
```

## 🛠️ Teknolojiler

- **3D Grafik**: Three.js
- **Fizik**: Özel fizik motoru (Magnus etkisi, yerçekimi)
- **Ses**: Web Audio API
- **Online**: LocalStorage (demo), Socket.io (server)

## 🎯 İpuçları

1. **Spin'i Gözle**: Topun etrafındaki renkli halka spin yönünü gösterir
2. **Hızlı Hareket**: Ne kadar hızlı hareket edersen o kadar çok spin
3. **Zamanlama**: Topa doğru anda vur, geç kalma
4. **Karışık Oyna**: Farklı spin'leri karıştır, rakibi şaşırt

## 📜 Lisans

MIT License

---

� İyi oyunlar!