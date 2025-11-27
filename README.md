# 🏓 Ping Pong Online

Gerçek zamanlı online multiplayer masa tenisi oyunu. Fizik tabanlı falso sistemi, lobi desteği ve modern UI ile!

## 🎮 Özellikler

### Oyun Modları
- **🌐 Online Oyna**: Arkadaşlarınla 4 haneli kod ile oyna
- **🤖 Bota Karşı**: Yapay zeka rakibine karşı pratik yap
- **🎯 Antrenman**: Tek başına top kontrolü çalış

### Fizik Sistemi
- **Magnus Etkisi**: Gerçekçi top eğrisi
- **Topspin**: Raket aşağı hareket ederken vuruş → Top aşağı eğrilir
- **Backspin**: Raket yukarı hareket ederken vuruş → Top yukarı eğrilir
- **Sidespin**: Raketin kenar kısmıyla vuruş → Top yana eğrilir
- **Duvar Sekmesi**: Spin'li toplar duvardan farklı açıyla döner

### Görsel Efektler
- Neon parıltı efektleri
- Top izi (trail) sistemi
- Spin göstergesi (renk kodlu)
- Parçacık efektleri
- Ekran sarsıntısı
- Flash efektleri

## 🚀 Kurulum

### Sadece Tarayıcıda (Offline Mod)
```bash
# index.html dosyasını tarayıcıda aç
# LocalStorage ile aynı tarayıcıda 2 sekme açarak test edebilirsin
```

### Sunucu ile (Online Mod)
```bash
# Bağımlılıkları yükle
npm install

# Sunucuyu başlat
npm start

# Tarayıcıda aç
http://localhost:3000
```

## 🎯 Kontroller

| Kontrol | İşlev |
|---------|-------|
| **Fare Hareketi** | Raketi kontrol et |
| **Hızlı Hareket** | Falso ekle (yukarı/aşağı) |
| **SPACE** | Power Shot şarj et |
| **Click** | Power Shot şarj et |
| **ESC** | Oyunu duraklat |
| **M** | Sesi aç/kapat |

## 🏆 Nasıl Falso Atılır?

### Topspin (Turuncu 🟠)
1. Raketi **aşağı doğru hızlıca hareket ettir**
2. Topa vur
3. Top aşağı doğru eğrilecek

### Backspin (Yeşil 🟢)
1. Raketi **yukarı doğru hızlıca hareket ettir**
2. Topa vur
3. Top yukarı doğru eğrilecek

### Sidespin (Sarı 🟡)
1. Raketin **üst veya alt kısmıyla** vur
2. Hızlı hareket et
3. Top yana doğru eğrilecek

## 🌐 Online Oynama

1. **Oda Oluştur** butonuna tıkla
2. 4 haneli kodu arkadaşınla paylaş
3. Arkadaşın kodu girer ve oyun başlar!

## 📁 Dosya Yapısı

```
pinpon/
├── index.html      # Ana HTML dosyası
├── game-v2.js      # Oyun motoru (gelişmiş)
├── server.js       # Socket.io sunucusu
├── package.json    # Node.js bağımlılıkları
└── README.md       # Bu dosya
```

## 🛠️ Teknolojiler

- **Frontend**: Vanilla JavaScript, Canvas 2D
- **Backend**: Node.js, Express, Socket.io
- **Fizik**: Özel fizik motoru (Magnus etkisi)
- **Ses**: Web Audio API
- **Styling**: CSS3 Animations, Gradients

## 📜 Lisans

MIT License

---

🎮 İyi oyunlar!