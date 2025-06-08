document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('start');
    const stopButton = document.getElementById('stop');
    const loading = document.getElementById('loading');
    const detectedItems = document.getElementById('detected-items');
    const shoppingCart = document.getElementById('shopping-cart');
    const checkoutSection = document.getElementById('checkout-section');
    const checkoutList = document.getElementById('checkout-list');
    const totalPrice = document.getElementById('total-price');
    const qrCodeDiv = document.getElementById('qrcode');
    const checkoutButton = document.getElementById('checkout');

    let products = [];
    let videoStream = null;
    let captureInterval = null;

    startButton.addEventListener('click', () => {
        console.log("Scan dimulai...");
        startButton.disabled = true;
        stopButton.disabled = false;
        loading.style.display = 'block';
        detectedItems.style.display = 'none';
        checkoutSection.style.display = 'none';
        shoppingCart.innerHTML = '';
        products = [];

        fetch('/start_scan', { method: 'POST' })
            .then(res => res.json())
            .then(data => console.log(data.status))
            .catch(err => console.error('Gagal memulai scan:', err));

        startCameraAndScan();
    });

    stopButton.addEventListener('click', () => {
        console.log("Scan dihentikan...");
        startButton.disabled = false;
        stopButton.disabled = true;
        loading.style.display = 'none';
        detectedItems.style.display = 'block';

        fetch('/stop_scan', { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                products = data.products || [];

                if (products.length === 0) {
                    shoppingCart.innerHTML = '<li>Tidak ada barang yang terdeteksi.</li>';
                    return;
                }

                shoppingCart.innerHTML = '';
                products.forEach(product => {
                    const li = document.createElement('li');
                    li.textContent = `${product.name} - Rp ${product.price.toLocaleString()} x${product.qty || 1}`;
                    shoppingCart.appendChild(li);
                });
            })
            .catch(err => console.error('Gagal menghentikan scan:', err));

        stopCameraAndScan();
    });

    checkoutButton?.addEventListener('click', () => {
        if (products.length === 0) {
            alert('Belum ada barang yang dipindai!');
            return;
        }

        detectedItems.style.display = 'none';
        checkoutSection.style.display = 'block';
        checkoutList.innerHTML = '';
        qrCodeDiv.innerHTML = '';

        let total = 0;
        products.forEach(product => {
            total += product.price;
            const li = document.createElement('li');
            li.textContent = `${product.name} - Rp ${product.price.toLocaleString()}`;
            checkoutList.appendChild(li);
        });

        totalPrice.textContent = `Total: Rp ${total.toLocaleString()}`;

        const checkoutData = `TOTAL PEMBAYARAN: Rp ${total.toLocaleString()}`;
        new QRCode(qrCodeDiv, {
            text: checkoutData,
            width: 200,
            height: 200
        });

        fetch('/save_transaction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ products, total })
        })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    console.log('Transaction saved successfully');
                } else {
                    console.log('Failed to save transaction');
                }
            });
    });

    async function startCameraAndScan() {
        const video = document.createElement('video');
        video.style.display = 'none';
        document.body.appendChild(video);

        try {
            videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = videoStream;
            await video.play();

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            captureInterval = setInterval(() => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                canvas.toBlob(async (blob) => {
                    const formData = new FormData();
                    formData.append('file', blob, 'capture.jpg');

                    const response = await fetch('/detect', {
                        method: 'POST',
                        body: formData
                    });

                    const detected = await response.json();

                    detected.forEach(product => {
                        if (!products.find(p => p.name === product.name)) {
                            products.push(product);
                            const li = document.createElement('li');
                            li.textContent = `${product.name} - Rp ${product.price.toLocaleString()}`;
                            shoppingCart.appendChild(li);
                        }
                    });
                }, 'image/jpeg');
            }, 4000);
        } catch (err) {
            console.error("Gagal mengakses kamera:", err);
        }
    }

    function stopCameraAndScan() {
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            videoStream = null;
        }
        clearInterval(captureInterval);
    }
});
