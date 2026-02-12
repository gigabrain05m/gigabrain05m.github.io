window.HELP_IMPROVE_VIDEOJS = false;

var INTERP_BASE = "./static/interpolation/stacked";
var NUM_INTERP_FRAMES = 240;

var interp_images = [];
function preloadInterpolationImages() {
  for (var i = 0; i < NUM_INTERP_FRAMES; i++) {
    var path = INTERP_BASE + '/' + String(i).padStart(6, '0') + '.jpg';
    interp_images[i] = new Image();
    interp_images[i].src = path;
  }
}

function setInterpolationImage(i) {
  var image = interp_images[i];
  image.ondragstart = function() { return false; };
  image.oncontextmenu = function() { return false; };
  $('#interpolation-image-wrapper').empty().append(image);
}


$(document).ready(function() {
    // Check for click events on the navbar burger icon
    $(".navbar-burger").click(function() {
      // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
      $(".navbar-burger").toggleClass("is-active");
      $(".navbar-menu").toggleClass("is-active");

    });

    function setLanguage(lang) {
      if (lang !== 'zh' && lang !== 'en') lang = 'en';
      $('body').removeClass('lang-en lang-zh').addClass('lang-' + lang);
      document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
      $('.lang-btn').removeClass('is-active').attr('aria-pressed', 'false');
      $('.lang-btn[data-lang="' + lang + '"]').addClass('is-active').attr('aria-pressed', 'true');
      try {
        window.localStorage.setItem('lang', lang);
      } catch (e) {}
    }

    var savedLang = null;
    try {
      savedLang = window.localStorage.getItem('lang');
    } catch (e) {}
    setLanguage(savedLang || 'en');

    $(document).on('click', '.lang-btn', function() {
      setLanguage($(this).attr('data-lang'));
    });

    var options = {
			slidesToScroll: 1,
			slidesToShow: 3,
			loop: true,
			infinite: true,
			autoplay: false,
			autoplaySpeed: 3000,
    }

		// Initialize all div with carousel class
    var carousels = bulmaCarousel.attach('.carousel', options);

    // Loop on each carousel initialized
    for(var i = 0; i < carousels.length; i++) {
    	// Add listener to  event
    	carousels[i].on('before:show', state => {
    		console.log(state);
    	});
    }

    // Access to bulmaCarousel instance of an element
    var element = document.querySelector('#my-element');
    if (element && element.bulmaCarousel) {
    	// bulmaCarousel instance is available as element.bulmaCarousel
    	element.bulmaCarousel.on('before-show', function(state) {
    		console.log(state);
    	});
    }

    /*var player = document.getElementById('interpolation-video');
    player.addEventListener('loadedmetadata', function() {
      $('#interpolation-slider').on('input', function(event) {
        console.log(this.value, player.duration);
        player.currentTime = player.duration / 100 * this.value;
      })
    }, false);*/
    var interpolationSlider = $('#interpolation-slider');
    var interpolationWrapper = $('#interpolation-image-wrapper');
    if (interpolationSlider.length && interpolationWrapper.length) {
      preloadInterpolationImages();

      interpolationSlider.on('input', function(event) {
        setInterpolationImage(this.value);
      });
      setInterpolationImage(0);
      interpolationSlider.prop('max', NUM_INTERP_FRAMES - 1);
    }

    var demoPlayer = document.getElementById('demo-video-player');
    if (demoPlayer) {
      function setDemoVideoSource(src, type) {
        var sourceEl = demoPlayer.querySelector('source');
        if (!sourceEl) {
          sourceEl = document.createElement('source');
          demoPlayer.appendChild(sourceEl);
        }

        if (sourceEl.src !== src) {
          sourceEl.src = src;
          sourceEl.type = type || 'video/mp4';
          demoPlayer.load();
        } else {
          demoPlayer.currentTime = 0;
        }

        var playPromise = demoPlayer.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(function() {});
        }
      }

      function setActiveDemoThumb($thumb) {
        $('.demo-video-thumb').removeClass('is-active').attr('aria-selected', 'false');
        $thumb.addClass('is-active').attr('aria-selected', 'true');

        var stripEl = document.querySelector('.demo-video-strip');
        if (stripEl && $thumb.length) {
          var thumbEl = $thumb.get(0);
          if (thumbEl && typeof thumbEl.scrollIntoView === 'function') {
            thumbEl.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
          }
        }
      }

      $(document).on('click', '.demo-video-thumb', function() {
        var $thumb = $(this);
        var src = $thumb.attr('data-src');
        var type = $thumb.attr('data-type') || 'video/mp4';
        if (!src) return;

        setActiveDemoThumb($thumb);
        setDemoVideoSource(src, type);
      });

      $(document).on('click', '.demo-carousel-prev, .demo-carousel-next', function() {
        var stripEl = document.querySelector('.demo-video-strip');
        if (!stripEl) return;
        var direction = $(this).hasClass('demo-carousel-prev') ? -1 : 1;
        var scrollAmount = Math.max(240, Math.floor(stripEl.clientWidth * 0.75));
        stripEl.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
      });
    }

    var valueVideo = document.getElementById('value-demo-video');
    var valueCanvas = document.getElementById('value-demo-canvas');
    var valueStatus = document.getElementById('value-demo-status');
    var valueOverlay = valueCanvas ? valueCanvas.closest('.value-demo-overlay') : null;

    if (valueVideo && valueCanvas && valueStatus && valueOverlay) {
      var ctx = valueCanvas.getContext('2d', { alpha: true });
      var valueSeries = null;
      var isDragging = false;
      var rafId = null;
      var controlsSafeZonePx = 64;
      var phases = [
        { start: 0, end: 46, zh: '反复尝试把衣服摆正阶段', en: 'Repeated alignment attempts', color: 'rgba(245, 158, 11, 0.95)' },
        { start: 46, end: 65, zh: '正常叠衣服状态', en: 'Normal folding', color: 'rgba(16, 185, 129, 0.95)' },
        { start: 65, end: 70, zh: '被干扰后再纠正', en: 'Recovering after disturbance', color: 'rgba(239, 68, 68, 0.95)' },
        { start: 70, end: 95, zh: '正常叠衣服状态', en: 'Normal folding', color: 'rgba(16, 185, 129, 0.95)' }
      ];

      function setStatus(enText, zhText) {
        var enEl = valueStatus.querySelector('.lang-en');
        var zhEl = valueStatus.querySelector('.lang-zh');
        if (enEl) enEl.textContent = enText;
        if (zhEl) zhEl.textContent = zhText;
      }

      function clamp01(v) {
        return Math.min(1, Math.max(0, v));
      }

      function resizeCanvas() {
        var rect = valueCanvas.getBoundingClientRect();
        var dpr = window.devicePixelRatio || 1;
        var w = Math.max(1, Math.floor(rect.width * dpr));
        var h = Math.max(1, Math.floor(rect.height * dpr));
        if (valueCanvas.width !== w || valueCanvas.height !== h) {
          valueCanvas.width = w;
          valueCanvas.height = h;
        }
        if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        draw();
      }

      function draw() {
        if (!ctx) return;
        var w = valueCanvas.clientWidth;
        var h = valueCanvas.clientHeight;
        if (w <= 0 || h <= 0) return;
        ctx.clearRect(0, 0, w, h);

        var pad = 10;
        var chartW = Math.max(1, w - pad * 2);
        var chartH = Math.max(1, h - pad * 2);

        if (!valueSeries || valueSeries.length < 2) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
          ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
          ctx.fillText('…', pad + 4, pad + 16);
          return;
        }

        var minV = Infinity;
        var maxV = -Infinity;
        for (var i = 0; i < valueSeries.length; i++) {
          var v = valueSeries[i];
          if (v < minV) minV = v;
          if (v > maxV) maxV = v;
        }
        if (!isFinite(minV) || !isFinite(maxV)) return;
        if (maxV - minV < 1e-6) {
          maxV = minV + 1e-6;
        }

        function xForIndex(idx) {
          var t = valueSeries.length <= 1 ? 0 : idx / (valueSeries.length - 1);
          return pad + t * chartW;
        }

        function yForValue(v) {
          var t = (v - minV) / (maxV - minV);
          return pad + (1 - t) * chartH;
        }

        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.92)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        for (var j = 0; j < valueSeries.length; j++) {
          var x = xForIndex(j);
          var y = yForValue(valueSeries[j]);
          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        var duration = valueVideo.duration;
        var ratio = 0;
        if (isFinite(duration) && duration > 0) {
          ratio = clamp01(valueVideo.currentTime / duration);
        }

        var playX = pad + ratio * chartW;
        var playIdx = Math.round(ratio * (valueSeries.length - 1));
        playIdx = Math.max(0, Math.min(valueSeries.length - 1, playIdx));
        var playY = yForValue(valueSeries[playIdx]);

        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.beginPath();
        ctx.moveTo(playX, pad);
        ctx.lineTo(playX, pad + chartH);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.30)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(playX, playY, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.86)';
        ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
        var label = 'v=' + valueSeries[playIdx].toFixed(3);
        var labelX = Math.min(w - 8, Math.max(8, playX + 10));
        var labelY = Math.min(h - 8, Math.max(14, playY - 10));
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = 10;
        ctx.fillText(label, labelX, labelY);
        ctx.shadowBlur = 0;

        var tSec = valueVideo.currentTime || 0;
        var phase = null;
        for (var k = 0; k < phases.length; k++) {
          if (tSec >= phases[k].start && tSec < phases[k].end) {
            phase = phases[k];
            break;
          }
        }
        if (!phase && phases.length) {
          phase = tSec < phases[0].start ? phases[0] : phases[phases.length - 1];
        }

        if (phase) {
          var isZh = document.body && document.body.classList.contains('lang-zh');
          var text = isZh ? phase.zh : phase.en;

          function roundRectPath(x, y, rw, rh, r) {
            r = Math.max(0, Math.min(r, rw / 2, rh / 2));
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + rw, y, x + rw, y + rh, r);
            ctx.arcTo(x + rw, y + rh, x, y + rh, r);
            ctx.arcTo(x, y + rh, x, y, r);
            ctx.arcTo(x, y, x + rw, y, r);
            ctx.closePath();
          }

          function pickFontAndMetrics(maxTextWidth) {
            var candidates = [
              '800 18px system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
              '800 16px system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
              '800 14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
              '800 12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
            ];
            for (var i = 0; i < candidates.length; i++) {
              ctx.font = candidates[i];
              var m = ctx.measureText(text);
              if (m.width <= maxTextWidth || i === candidates.length - 1) {
                return { font: candidates[i], metrics: m };
              }
            }
            ctx.font = candidates[candidates.length - 1];
            return { font: candidates[candidates.length - 1], metrics: ctx.measureText(text) };
          }

          var maxBadgeW = Math.max(220, Math.min(w - 24, 640));
          var padX = 16;
          var padY = 12;
          var stripW = 10;
          var stripGap = 12;
          var innerMaxTextW = maxBadgeW - (padX * 2 + stripW + stripGap);
          var picked = pickFontAndMetrics(innerMaxTextW);
          var textMetrics = picked.metrics;
          var ascent = textMetrics.actualBoundingBoxAscent || 14;
          var descent = textMetrics.actualBoundingBoxDescent || 5;
          var badgeH = Math.ceil(ascent + descent + padY * 2);
          var textW = Math.min(innerMaxTextW, textMetrics.width);
          var badgeW = Math.min(maxBadgeW, Math.ceil(padX * 2 + stripW + stripGap + textW));
          var bx = Math.floor((w - badgeW) / 2);
          var desiredBy = Math.floor(h * 0.14);
          var maxBy = h - controlsSafeZonePx - badgeH - 12;
          var by = Math.max(12, Math.min(desiredBy, maxBy));

          ctx.shadowColor = 'rgba(0, 0, 0, 0.40)';
          ctx.shadowBlur = 14;
          roundRectPath(bx, by, badgeW, badgeH, 12);
          ctx.fillStyle = 'rgba(16, 24, 40, 0.44)';
          ctx.fill();
          ctx.shadowBlur = 0;

          roundRectPath(bx, by, badgeW, badgeH, 12);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.20)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = phase.color;
          roundRectPath(bx + padX, by + padY, stripW, badgeH - padY * 2, 5);
          ctx.fill();

          ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
          ctx.shadowBlur = 10;
          ctx.font = picked.font;
          ctx.textBaseline = 'alphabetic';
          ctx.fillText(text, bx + padX + stripW + stripGap, by + padY + ascent);
          ctx.shadowBlur = 0;
        }

        if (isFinite(duration) && duration > 0 && phases && phases.length) {
          var barH = 8;
          var barPad = 12;
          var barX = barPad;
          var barW = Math.max(1, w - barPad * 2);
          var barY = h - controlsSafeZonePx - barH - 10;
          if (barY > pad + 10) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
            ctx.shadowBlur = 10;
            roundRectPath(barX, barY, barW, barH, 999);
            ctx.fillStyle = 'rgba(16, 24, 40, 0.35)';
            ctx.fill();
            ctx.shadowBlur = 0;

            for (var s = 0; s < phases.length; s++) {
              var segStart = Math.max(0, Math.min(duration, phases[s].start));
              var segEnd = Math.max(0, Math.min(duration, phases[s].end));
              if (segEnd <= segStart) continue;
              var x0 = barX + (segStart / duration) * barW;
              var x1 = barX + (segEnd / duration) * barW;
              ctx.fillStyle = phases[s].color.replace('0.95', '0.90');
              ctx.fillRect(x0, barY, Math.max(1, x1 - x0), barH);
            }

            var markerX = barX + ratio * barW;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(markerX, barY - 4);
            ctx.lineTo(markerX, barY + barH + 4);
            ctx.stroke();
          }
        }
      }

      function startTick() {
        if (rafId != null) return;
        rafId = window.requestAnimationFrame(function tick() {
          draw();
          rafId = window.requestAnimationFrame(tick);
        });
      }

      function stopTick() {
        if (rafId == null) return;
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }

      function scrubToClientX(clientX) {
        var rect = valueOverlay.getBoundingClientRect();
        var x = clientX - rect.left;
        var ratio = rect.width > 0 ? x / rect.width : 0;
        ratio = clamp01(ratio);
        if (isFinite(valueVideo.duration) && valueVideo.duration > 0) {
          valueVideo.currentTime = ratio * valueVideo.duration;
        }
        draw();
      }

      valueOverlay.addEventListener('pointerdown', function(e) {
        var rect = valueOverlay.getBoundingClientRect();
        var y = e.clientY - rect.top;
        if (y > rect.height - controlsSafeZonePx) {
          return;
        }
        isDragging = true;
        valueOverlay.classList.add('is-dragging');
        try {
          valueOverlay.setPointerCapture(e.pointerId);
        } catch (err) {}
        scrubToClientX(e.clientX);
        e.preventDefault();
      });

      valueOverlay.addEventListener('pointermove', function(e) {
        if (!isDragging) return;
        scrubToClientX(e.clientX);
        e.preventDefault();
      });

      function endDrag(e) {
        if (!isDragging) return;
        isDragging = false;
        valueOverlay.classList.remove('is-dragging');
        try {
          valueOverlay.releasePointerCapture(e.pointerId);
        } catch (err) {}
        e.preventDefault();
      }

      valueOverlay.addEventListener('pointerup', endDrag);
      valueOverlay.addEventListener('pointercancel', endDrag);
      valueOverlay.addEventListener('pointerleave', function() {
        if (!isDragging) return;
        isDragging = false;
        valueOverlay.classList.remove('is-dragging');
      });

      valueVideo.addEventListener('loadedmetadata', draw);
      valueVideo.addEventListener('timeupdate', draw);
      valueVideo.addEventListener('seeked', draw);
      valueVideo.addEventListener('play', startTick);
      valueVideo.addEventListener('pause', stopTick);
      valueVideo.addEventListener('ended', stopTick);

      var ro = new ResizeObserver(function() {
        resizeCanvas();
      });
      ro.observe(valueOverlay);
      window.addEventListener('resize', resizeCanvas);

      fetch('./assets/value.json', { cache: 'no-store' })
        .then(function(res) {
          if (!res.ok) throw new Error('Failed to load value.json');
          return res.json();
        })
        .then(function(data) {
          var preds = data && Array.isArray(data.predictions) ? data.predictions : (Array.isArray(data) ? data : null);
          if (!preds || preds.length < 2) throw new Error('Invalid prediction data');
          var sampled = [];
          for (var i = 0; i < preds.length; i += 2) {
            sampled.push(clamp01(1 - preds[i]));
          }
          valueSeries = sampled;
          setStatus('Prediction data loaded.', '预测数据已加载。');
          resizeCanvas();
        })
        .catch(function(err) {
          setStatus('Failed to load prediction data.', '预测数据加载失败。');
          console.error(err);
        });
    }

    bulmaSlider.attach();

})
