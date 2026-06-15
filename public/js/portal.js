      const body = document.body;
      const assistantPanel = document.querySelector(".assistant-panel");
      const assistantToggle = document.querySelector(".assistant-toggle");
      const assistantRestore = document.querySelector(".assistant-restore");
      const switchButton = document.querySelector(".switch-btn");
      const newChatButton = document.querySelector(".new-chat-button");
      const composerTextarea = document.querySelector(".composer textarea");
      const heroComposer = document.querySelector(".hero-composer");
      const heroComposerTextarea = document.querySelector(".hero-composer textarea");
      const rotatingTitle = document.querySelector(".rotating-title");
      const heroModeOptions = document.querySelectorAll(".hero-mode-option");
      const heroSuggestions = document.querySelectorAll(".hero-suggestion");
      const heroSlides = document.querySelectorAll(".hero-slide");
      const navPageButtons = document.querySelectorAll(".main-nav [data-page]");
      const pageJumpButtons = document.querySelectorAll("[data-page-jump]");
      const heroKicker = document.querySelector("[data-page-kicker]");
      const heroTitle = document.querySelector("[data-page-title]");
      const heroPanelCollapse = document.querySelector(".hero-panel-collapse");
      const categoryButtons = document.querySelectorAll(".category-tabs button");
      const productCards = document.querySelectorAll(".product-card");
      const content = document.querySelector(".content");
      const revealNodes = document.querySelectorAll(
        ".portal-section, .portal-product, .solution-card, .case-card, .news-card, .hot-card, .footer-col"
      );
      const detailBack = document.querySelector(".detail-back");
      const detailTitle = document.querySelector("[data-detail-title]");
      const detailSummary = document.querySelector("[data-detail-summary]");
      const detailPrice = document.querySelector("[data-detail-price]");
      const detailVisualWrap = document.querySelector(".detail-visual");
      const detailVisual = document.querySelector("[data-detail-visual]");
      const detailImagesPanel = document.querySelector("[data-detail-images-panel]");
      const detailHeroImage = document.querySelector("[data-detail-hero-image]");
      const detailHeroTitle = document.querySelector("[data-detail-hero-title]");
      const detailHeroDesc = document.querySelector("[data-detail-hero-desc]");
      const detailReviewOne = document.querySelector("[data-detail-review-one]");
      const detailReviewTwo = document.querySelector("[data-detail-review-two]");
      const detailReviewThree = document.querySelector("[data-detail-review-three]");
      const detailSpecGrid = document.querySelector("[data-detail-spec-grid]");
      let currentPageKey = "home";
      let rotatingTitleTimer;
      let heroSlideIndex = 0;
      const pageConfigs = {
        personal: {
          kicker: "2026 拯救者PC新品震撼来袭",
          title: "拯救驾临 执御客川",
          categories: ["推荐", "小新", "拯救者", "YOGA", "ThinkPad", "手机", "配件"],
          products: [
            ["联想小新", "小新AIR13", "2.5K 120Hz｜轻至1.1kg", "¥ 9799", "", "/assets/img/shop-1.jpg"],
            ["", "小新AIR13", "2.5K 120Hz｜轻至1.1kg", "¥ 9799", "", "/assets/img/shop-2.jpg"],
            ["Lecoo", "小新AIR13", "2.5K 120Hz｜轻至1.1kg", "¥ 9799", "side", "/assets/img/shop-3.jpg"],
            ["拯救者 LEGION", "小新AIR13", "2.5K 120Hz｜轻至1.1kg", "国补后￥9799", "", "/assets/img/shop-4.jpg"],
            ["", "小新AIR13", "2.5K 120Hz｜轻至1.1kg", "¥ 9799", "dark", "/assets/img/shop-5.jpg"],
            ["", "小新AIR13", "2.5K 120Hz｜轻至1.1kg", "¥ 9799", "dark", "/assets/img/shop-7.jpg"],
            ["拯救者 LEGION", "小新AIR13", "2.5K 120Hz｜轻至1.1kg", "¥ 9799", "dark", "/assets/img/shop-8.jpg"],
            ["", "小新AIR13", "2.5K 120Hz｜轻至1.1kg", "¥ 9799", "", "/assets/img/shop-9.jpg"],
            ["联想小新", "小新AIR13", "2.5K 120Hz｜轻至1.1kg", "¥ 9799", "side", "/assets/img/shop-10.jpg"],
            ["", "小新AIR13", "2.5K 120Hz｜轻至1.1kg", "¥ 9799", "dark", "/assets/img/shop-11.jpg"],
            ["Lecoo", "小新AIR13", "2.5K 120Hz｜轻至1.1kg", "¥ 9799", "", "/assets/img/shop-12.jpg"],
            ["拯救者 LEGION", "小新AIR13", "2.5K 120Hz｜轻至1.1kg", "国补后￥9799", "dark", "/assets/img/shop-13.jpg"],
            ["", "小新AIR13", "2.5K 120Hz｜轻至1.1kg", "¥ 9799", "side", "/assets/img/shop-14.jpg"],
            ["联想小新", "小新AIR13", "2.5K 120Hz｜轻至1.1kg", "¥ 9799", "", "/assets/img/shop-14.jpg"]
          ]
        },
        business: {
          kicker: "联想中小企业智能办公方案",
          title: "高效办公 灵活成长",
          categories: ["推荐", "ThinkCentre", "ThinkBook", "ThinkPad", "商用台式机", "显示器", "服务"],
          products: [
            ["ThinkCentre", "启天M商用台式机", "稳定高效｜企业级管理", "¥ 4999", ""],
            ["ThinkBook", "ThinkBook 14", "轻薄办公｜长效续航", "¥ 5999", ""],
            ["ThinkPad", "ThinkPad E14", "商务可靠｜安全加固", "¥ 6299", "dark"],
            ["联想服务", "企业IT服务包", "部署运维｜远程支持", "咨询报价", ""],
            ["ThinkVision", "商用显示器", "低蓝光｜多接口扩展", "¥ 1299", ""],
            ["联想小新", "办公套装方案", "电脑+显示器｜一站采购", "组合优惠", ""],
            ["ThinkCentre", "迷你主机方案", "小巧节能｜集中部署", "¥ 3999", ""],
            ["Lenovo AI", "AI办公助手方案", "会议纪要｜资料检索", "了解方案", "dark"]
          ]
        },
        enterprise: {
          kicker: "政教及大企业数字化终端方案",
          title: "安全可信 规模交付",
          categories: ["推荐", "政教采购", "大企业", "工作站", "服务器", "安全服务", "定制"],
          products: [
            ["政教方案", "昭阳商用笔记本", "国产化适配｜集中管控", "咨询报价", ""],
            ["ThinkStation", "高性能工作站", "专业图形｜稳定算力", "¥ 12999", "dark"],
            ["联想服务", "大客户运维服务", "SLA支持｜驻场保障", "定制报价", ""],
            ["教育方案", "智慧教学终端", "教室部署｜统一管理", "了解方案", ""],
            ["安全可信", "终端安全套件", "身份认证｜数据防护", "咨询报价", ""],
            ["ThinkPad", "旗舰商务终端", "高可靠｜高安全", "¥ 9999", "dark"],
            ["数据中心", "边缘服务器", "稳定扩展｜集中运维", "定制报价", "dark"],
            ["联想定制", "行业专属方案", "批量交付｜深度定制", "联系顾问", ""]
          ]
        }
      };
      const params = new URLSearchParams(window.location.search);
      revealNodes.forEach((node, index) => {
        node.style.setProperty("--reveal-delay", `${Math.min(index % 6, 5) * 70}ms`);
      });
      const revealObserver = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? null
        : new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-visible");
                revealObserver?.unobserve(entry.target);
              });
            },
            {
              root: content,
              threshold: 0.16,
              rootMargin: "0px 0px -8% 0px"
            }
          );
      revealNodes.forEach((node) => {
        if (revealObserver) {
          revealObserver.observe(node);
        } else {
          node.classList.add("is-visible");
        }
      });
      const refreshHomeReveal = () => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          revealNodes.forEach((node) => node.classList.add("is-visible"));
          return;
        }
        requestAnimationFrame(() => {
          revealNodes.forEach((node) => {
            const rect = node.getBoundingClientRect();
            const contentRect = content?.getBoundingClientRect();
            const viewportBottom = contentRect ? contentRect.bottom : window.innerHeight;
            if (rect.top < viewportBottom - 24) {
              node.classList.add("is-visible");
            }
          });
        });
      };
      const setupRotatingTitle = () => {
        if (!rotatingTitle) return;
        const words = Array.from(rotatingTitle.querySelectorAll(".word"));
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let activeIndex = 0;

        const updateWord = () => {
          words.forEach((word, index) => {
            word.classList.toggle("is-active", index === activeIndex);
          });
          const activeWord = words[activeIndex];
          rotatingTitle.style.setProperty("--rotating-title-width", `${activeWord.getBoundingClientRect().width}px`);
        };

        updateWord();
        rotatingTitle.classList.add("is-ready");
        window.addEventListener("resize", updateWord);

        if (reduceMotion || words.length < 2) return;
        rotatingTitleTimer = window.setInterval(() => {
          activeIndex = (activeIndex + 1) % words.length;
          updateWord();
        }, 2000);
      };
      const setupHeroCarousel = () => {
        if (heroSlides.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        window.setInterval(() => {
          heroSlides[heroSlideIndex]?.classList.remove("is-active");
          heroSlideIndex = (heroSlideIndex + 1) % heroSlides.length;
          heroSlides[heroSlideIndex]?.classList.add("is-active");
        }, 4200);
      };
      const updateStaticDetailPanels = ({ brand, title, spec, image }) => {
        if (detailImagesPanel) {
          detailImagesPanel.innerHTML = image
            ? `<img src="${image}" alt="${title} 产品详情图" loading="lazy" />`
            : `<div class="detail-images-empty">暂无详情图</div>`;
        } else if (detailHeroImage && image) {
          detailHeroImage.src = image;
          detailHeroImage.alt = `${title} 产品详情图`;
        }
        if (detailHeroTitle) detailHeroTitle.textContent = title;
        if (detailHeroDesc) detailHeroDesc.textContent = `${spec}。围绕性能、体验、服务和购买决策展示核心信息，支持继续向联想乐享咨询选型与对比。`;
        if (detailReviewOne) detailReviewOne.textContent = `${title} 在日常使用中响应稳定，适合按预算和场景做进一步选型。`;
        if (detailReviewTwo) detailReviewTwo.textContent = `外观质感和核心配置符合预期，${spec} 覆盖主要使用需求。`;
        if (detailReviewThree) detailReviewThree.textContent = "通过联想乐享可以继续确认优惠、门店服务和同类商品对比。";
        if (detailSpecGrid) {
          const specs = [
            ["品牌/系列", brand || "联想官方"],
            ["商品名称", title],
            ["核心规格", spec],
            ["服务支持", "官方保修与售后支持"],
            ["导购能力", "支持选型、优惠和对比咨询"],
            ["价格库存", "以实际下单页为准"]
          ];
          detailSpecGrid.innerHTML = specs.map(([label, value]) => `<div class="detail-spec-row"><span>${label}</span><strong>${value}</strong></div>`).join("");
        }
      };
      const openProductDetail = (index) => {
        const config = pageConfigs[currentPageKey] || pageConfigs.personal;
        const product = config.products[index] || config.products[0];
        const [brand, title, spec, price, visual, image] = product;
        if (detailTitle) detailTitle.textContent = title;
        if (detailSummary) detailSummary.textContent = `${spec}，适合按照预算、用途和服务需求进行选择，支持继续向联想乐享 AI 助手咨询对比。`;
        if (detailPrice) detailPrice.textContent = price;
        if (detailVisualWrap) {
          detailVisualWrap.innerHTML = image
            ? `<img class="detail-product-image" src="${image}" alt="${title}" data-detail-visual />`
            : `<div class="laptop${visual ? ` ${visual}` : ""}" data-detail-visual><div class="screen"></div><div class="base"></div></div>`;
        } else if (detailVisual) {
          detailVisual.className = `laptop${visual ? ` ${visual}` : ""}`;
        }
        updateStaticDetailPanels({ brand, title, spec, image });
        if (content) {
          content.dataset.view = "detail";
          content.scrollTo({ top: 0, behavior: "smooth" });
        }
      };
      const applyPage = (pageKey) => {
        if (pageKey === "home") {
          currentPageKey = "home";
          body.dataset.page = "home";
          body.classList.remove("assistant-collapsed", "assistant-right", "assistant-fullscreen");
          switchButton?.setAttribute("aria-pressed", "false");
          assistantToggle?.setAttribute("aria-expanded", "false");
          if (content) content.dataset.view = "home";
          navPageButtons.forEach((button) => {
            button.classList.toggle("active", button.dataset.page === "home");
          });
          content?.scrollTo({ top: 0, behavior: "smooth" });
          refreshHomeReveal();
          return;
        }
        if (pageKey === "brand") {
          currentPageKey = "brand";
          body.dataset.page = "brand";
          body.classList.remove("assistant-collapsed", "assistant-right", "assistant-fullscreen");
          switchButton?.setAttribute("aria-pressed", "false");
          assistantToggle?.setAttribute("aria-expanded", "true");
          if (content) content.dataset.view = "brand";
          navPageButtons.forEach((button) => {
            button.classList.toggle("active", button.dataset.page === "brand");
          });
          content?.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
        const config = pageConfigs[pageKey] || pageConfigs.personal;
        currentPageKey = pageConfigs[pageKey] ? pageKey : "personal";
        body.dataset.page = currentPageKey;
        body.classList.remove("assistant-collapsed");
        assistantToggle?.setAttribute("aria-expanded", "true");
        if (content) content.dataset.view = "list";
        navPageButtons.forEach((button) => {
          button.classList.toggle("active", button.dataset.page === pageKey);
        });
        if (heroKicker) heroKicker.textContent = config.kicker;
        if (heroTitle) heroTitle.textContent = config.title;
        categoryButtons.forEach((button, index) => {
          button.textContent = config.categories[index] || "";
          button.classList.toggle("active", index === 0);
          button.hidden = !config.categories[index];
        });
        productCards.forEach((card, index) => {
          const product = config.products[index] || config.products[0];
          const [brand, title, spec, price, visual, image] = product;
          const brandNode = card.querySelector(".brand-mini");
          const titleNode = card.querySelector(".product-title");
          const specNode = card.querySelector(".spec");
          const priceNode = card.querySelector(".price");
          const visualNode = card.querySelector(".product-visual");
          if (brandNode) {
            brandNode.textContent = brand;
            brandNode.classList.toggle("orange", brand === "Lecoo");
          }
          if (titleNode) titleNode.textContent = title;
          if (specNode) specNode.textContent = spec;
          if (priceNode) priceNode.textContent = price;
          if (visualNode) {
            visualNode.innerHTML = image
              ? `<img src="${image}" alt="${title}" />`
              : `<div class="laptop${visual ? ` ${visual}` : ""}"><div class="screen"></div><div class="base"></div></div>`;
          }
          card.dataset.productIndex = String(index);
          card.tabIndex = 0;
          card.setAttribute("role", "button");
          card.setAttribute("aria-label", `查看${title}商品详情`);
        });
      };
      productCards.forEach((card) => {
        card.addEventListener("click", () => {
          openProductDetail(Number(card.dataset.productIndex || 0));
        });
        card.addEventListener("keydown", (event) => {
          if (!["Enter", " "].includes(event.key)) return;
          event.preventDefault();
          openProductDetail(Number(card.dataset.productIndex || 0));
        });
      });
      detailBack?.addEventListener("click", () => {
        if (content) {
          content.dataset.view = "list";
          content.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
      navPageButtons.forEach((button) => {
        button.addEventListener("click", () => {
          applyPage(button.dataset.page);
        });
      });
      pageJumpButtons.forEach((button) => {
        button.addEventListener("click", () => {
          applyPage(button.dataset.pageJump);
        });
      });
      heroModeOptions.forEach((button) => {
        button.addEventListener("click", () => {
          heroModeOptions.forEach((option) => {
            const isActive = option === button;
            option.classList.toggle("is-active", isActive);
            option.setAttribute("aria-pressed", String(isActive));
          });
          // 首页「快速/思考」选择同步到对话区「深度思考」开关
          const wantThink = button.textContent.trim() === "思考";
          const thinkChip = document.querySelector('.composer .chip[data-mode-chip="think"]');
          if (thinkChip) {
            thinkChip.classList.toggle("is-active", wantThink);
            thinkChip.setAttribute("aria-pressed", String(wantThink));
          }
        });
      });
      document.querySelectorAll('.composer .chip[data-mode-chip]').forEach((chip) => {
        const toggleChip = () => {
          const active = chip.classList.toggle("is-active");
          chip.setAttribute("aria-pressed", String(active));
        };
        chip.addEventListener("click", toggleChip);
        chip.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          toggleChip();
        });
      });
      heroSuggestions.forEach((button) => {
        button.addEventListener("click", () => {
          if (!heroComposerTextarea) return;
          heroComposerTextarea.value = button.textContent.trim();
          heroComposerTextarea.focus();
        });
      });
      setupRotatingTitle();
      setupHeroCarousel();
      applyPage(params.get("page") || "home");
      if (params.has("detail")) {
        openProductDetail(Number(params.get("detail") || 0));
      }
      if (params.get("state") === "chat") {
        body.dataset.state = "chat";
      }
      if (params.get("demo") === "hover") {
        body.dataset.state = "chat";
        body.dataset.demo = "hover";
      }
      const startControls = document.querySelectorAll("[data-start-chat]");
      startControls.forEach((control) => {
        control.addEventListener("click", (event) => {
          event.preventDefault();
          body.dataset.state = "chat";
        });
      });
      const historyButton = document.querySelector(".history-button");
      const historySidebar = document.querySelector(".assistant-history-sidebar");
      const historyClose = document.querySelector(".assistant-history-close");
      const setHistorySidebar = (open) => {
        body.classList.toggle("assistant-history-open", open);
        historyButton?.classList.toggle("is-active", open);
        historyButton?.setAttribute("aria-expanded", String(open));
        historySidebar?.setAttribute("aria-hidden", String(!open));
      };
      historyButton?.addEventListener("click", () => {
        const nextOpen = !body.classList.contains("assistant-history-open");
        if (nextOpen) {
          setAssistantFullscreen(true);
        }
        setHistorySidebar(nextOpen);
      });
      historyClose?.addEventListener("click", () => {
        setHistorySidebar(false);
      });
      const resizeComposer = () => {
        if (!composerTextarea) return;
        composerTextarea.style.height = "auto";
        const maxHeight = parseFloat(getComputedStyle(composerTextarea).maxHeight) || 118;
        const nextHeight = Math.min(composerTextarea.scrollHeight, maxHeight);
        composerTextarea.style.height = `${nextHeight}px`;
        composerTextarea.style.overflowY = composerTextarea.scrollHeight > maxHeight ? "auto" : "hidden";
      };
      composerTextarea?.addEventListener("input", resizeComposer);
      resizeComposer();
      const resizeHeroComposer = () => {
        if (!heroComposerTextarea) return;
        heroComposerTextarea.style.height = "auto";
        const nextHeight = Math.min(heroComposerTextarea.scrollHeight, 132);
        heroComposerTextarea.style.height = `${nextHeight}px`;
      };
      heroComposerTextarea?.addEventListener("input", resizeHeroComposer);
      resizeHeroComposer();
      heroComposer?.addEventListener("submit", (event) => {
        event.preventDefault();
        applyPage("personal");
        body.dataset.state = "chat";
      });

      const shell = document.querySelector(".shell");
      const panelResizer = document.querySelector(".panel-resizer");
      const clampPanelWidth = (width) => {
        const minWidth = window.innerWidth <= 1280 ? 300 : 312;
        const maxWidth = Math.min(window.innerWidth * 0.42, window.innerWidth <= 1280 ? 420 : 720);
        return Math.round(Math.max(minWidth, Math.min(width, maxWidth)));
      };
      const setPanelWidth = (width) => {
        body.style.setProperty("--assistant-panel-width", `${clampPanelWidth(width)}px`);
      };
      const setAssistantFullscreen = (expanded) => {
        body.classList.toggle("assistant-fullscreen", expanded);
        if (expanded) {
          body.classList.remove("assistant-collapsed", "assistant-right");
          switchButton?.setAttribute("aria-pressed", "false");
        } else {
          setHistorySidebar(false);
        }
        assistantToggle?.setAttribute("aria-expanded", String(expanded));
        assistantToggle?.setAttribute("aria-pressed", String(expanded));
        assistantToggle?.setAttribute("aria-label", expanded ? "退出全屏对话" : "对话全屏");
        assistantToggle?.setAttribute("title", expanded ? "退出全屏对话" : "对话全屏");
      };
      const setAssistantCollapsed = (collapsed) => {
        if (collapsed) setAssistantFullscreen(false);
        body.classList.toggle("assistant-collapsed", collapsed);
        assistantToggle?.setAttribute("aria-expanded", String(!collapsed));
      };
      assistantToggle?.addEventListener("click", () => {
        setAssistantFullscreen(!body.classList.contains("assistant-fullscreen"));
      });
      heroPanelCollapse?.addEventListener("click", () => {
        setAssistantFullscreen(true);
        body.dataset.state = "default";
        composerTextarea?.focus();
      });
      assistantRestore?.addEventListener("click", () => {
        setAssistantCollapsed(false);
      });
      switchButton?.addEventListener("click", () => {
        setAssistantFullscreen(false);
        const isRight = body.classList.toggle("assistant-right");
        switchButton.setAttribute("aria-pressed", String(isRight));
      });
      panelResizer?.addEventListener("pointerdown", (event) => {
        if (body.classList.contains("assistant-collapsed") || body.classList.contains("assistant-fullscreen")) return;
        event.preventDefault();
        panelResizer.setPointerCapture(event.pointerId);
        body.classList.add("is-resizing");
      });
      panelResizer?.addEventListener("pointermove", (event) => {
        if (!body.classList.contains("is-resizing") || !shell) return;
        const shellRect = shell.getBoundingClientRect();
        const shellStyles = getComputedStyle(shell);
        const shellPaddingLeft = parseFloat(shellStyles.paddingLeft) || 0;
        const shellPaddingRight = parseFloat(shellStyles.paddingRight) || 0;
        const width = body.classList.contains("assistant-right")
          ? shellRect.right - shellPaddingRight - event.clientX
          : event.clientX - shellRect.left - shellPaddingLeft;
        setPanelWidth(width);
      });
      panelResizer?.addEventListener("pointerup", (event) => {
        panelResizer.releasePointerCapture(event.pointerId);
        body.classList.remove("is-resizing");
      });
      panelResizer?.addEventListener("pointercancel", () => {
        body.classList.remove("is-resizing");
      });
      panelResizer?.addEventListener("dblclick", () => {
        body.style.removeProperty("--assistant-panel-width");
      });
      panelResizer?.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home"].includes(event.key)) return;
        event.preventDefault();
        if (event.key === "Home") {
          body.style.removeProperty("--assistant-panel-width");
          return;
        }
        const current = assistantPanel?.getBoundingClientRect().width || 336;
        const isRight = body.classList.contains("assistant-right");
        const delta = event.key === "ArrowRight" ? (isRight ? -12 : 12) : (isRight ? 12 : -12);
        setPanelWidth(current + delta);
      });
