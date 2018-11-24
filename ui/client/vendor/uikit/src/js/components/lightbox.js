import { util } from 'uikit';

var {$, doc, extend, Dimensions, getIndex, Transition} = util;
var active;

doc.on({
    keydown: e => {
        if (active) {
            switch (e.keyCode) {
                case 37:
                    active.show('previous');
                    break;
                case 39:
                    active.show('next');
                    break;
            }
        }
    }
});

UIkit.component('lightbox', {

    name: 'lightbox',

    props: {
        toggle: String,
        duration: Number,
        inverse: Boolean
    },

    defaults: {
        toggle: 'a',
        duration: 400,
        dark: false,
        attrItem: 'uk-lightbox-item',
        items: [],
        index: 0
    },

    ready() {

        this.toggles = $(this.toggle, this.$el);

        this.toggles.each((i, el) => {
            el = $(el);
            this.items.push({
                source: el.attr('href'),
                title: el.attr('title'),
                type: el.attr('type')
            })
        });

        this.$el.on('click', `${this.toggle}:not(.uk-disabled)`, e => {
            e.preventDefault();
            this.show(this.toggles.index(e.currentTarget));
        });

    },

    update: {

        write() {

            var item = this.getItem();

            if (!this.modal || !item.content) {
                return;
            }

            var panel = this.modal.panel,
                dim = {width: panel.width(), height: panel.height()},
                max = {
                    width: window.innerWidth - (panel.outerWidth(true) - dim.width),
                    height: window.innerHeight - (panel.outerHeight(true) - dim.height)
                },
                newDim = Dimensions.fit({width: item.width, height: item.height}, max);

            Transition
                .stop(panel)
                .stop(this.modal.content);

            if (this.modal.content) {
                this.modal.content.remove();
            }

            this.modal.content = $(item.content).css('opacity', 0).appendTo(panel);
            panel.css(dim);

            Transition.start(panel, newDim, this.duration).then(() => {
                Transition.start(this.modal.content, {opacity: 1}, 400).then(() => {
                    panel.find('[uk-transition-hide]').show();
                    panel.find('[uk-transition-show]').hide();
                });
            });

        },

        events: ['resize', 'orientationchange']

    },

    events: {

        showitem(e) {

            var item = this.getItem();

            if (item.content) {
                this.$update();
                e.stopImmediatePropagation();
            }
        }

    },

    methods: {

        show(index) {

            this.index = getIndex(index, this.items, this.index);

            if (!this.modal) {
                this.modal = UIkit.modal.dialog(`
                    <button class="uk-modal-close-outside" uk-transition-hide type="button" uk-close></button>
                    <span class="uk-position-center" uk-transition-show uk-icon="icon: trash"></span>
                    `, {center: true});
                this.modal.$el.css('overflow', 'hidden').addClass('uk-modal-lightbox');
                this.modal.panel.css({width: 200, height: 200});
                this.modal.caption = $('<div class="uk-modal-caption" uk-transition-hide></div>').appendTo(this.modal.panel);

                if (this.items.length > 1) {
                    $(`<div class="${this.dark ? 'uk-dark' : 'uk-light'}" uk-transition-hide>
                            <a href="#" class="uk-position-center-left" uk-slidenav="previous" uk-lightbox-item="previous"></a>
                            <a href="#" class="uk-position-center-right" uk-slidenav="next" uk-lightbox-item="next"></a>
                        </div>
                    `).appendTo(this.modal.panel.addClass('uk-slidenav-position'));
                }

                this.modal.$el
                    .on('hide', this.hide)
                    .on('click', `[${this.attrItem}]`, e => {
                        e.preventDefault();
                        this.show($(e.currentTarget).attr(this.attrItem));
                    }).on('swipeRight swipeLeft', e => {
                    e.preventDefault();
                    if (!window.getSelection().toString()) {
                        this.show(e.type == 'swipeLeft' ? 'next' : 'previous');
                    }
                });
            }

            active = this;

            this.modal.panel.find('[uk-transition-hide]').hide();
            this.modal.panel.find('[uk-transition-show]').show();

            this.modal.content && this.modal.content.remove();
            this.modal.caption.text(this.getItem().title);

            var event = $.Event('showitem');
            this.$el.trigger(event);
            if (!event.isImmediatePropagationStopped()) {
                this.setError(this.getItem());
            }
        },

        hide() {

            active = active && active !== this && active;

            this.modal.hide().then(() => {
                this.modal.$destroy(true);
                this.modal = null;
            });
        },

        getItem() {
            return this.items[this.index] || {source: '', title: '', type: ''};
        },

        setItem(item, content, width = 200, height = 200) {
            extend(item, {content, width, height});
            this.$update();
        },

        setError(item) {
            this.setItem(item, '<div class="uk-position-cover uk-flex uk-flex-middle uk-flex-center"><strong>Loading resource failed!</strong></div>', 400, 300);
        }

    }

});

UIkit.mixin({

    events: {

        showitem(e) {

            let item = this.getItem();

            if (item.type !== 'image' && item.source && !item.source.match(/\.(jp(e)?g|png|gif|svg)$/i)) {
                return;
            }

            var img = new Image();

            img.onerror = () => this.setError(item);
            img.onload = () => this.setItem(item, `<img class="uk-responsive-width" width="${img.width}" height="${img.height}" src ="${item.source}">`, img.width, img.height);

            img.src = item.source;

            e.stopImmediatePropagation();
        }

    }

}, 'lightbox');

UIkit.mixin({

    events: {

        showitem(e) {

            let item = this.getItem();

            if (item.type !== 'video' && item.source && !item.source.match(/\.(mp4|webm|ogv)$/i)) {
                return;
            }

            var vid = $('<video class="uk-responsive-width" controls></video>')
                .on('loadedmetadata', () => this.setItem(item, vid.attr({width: vid[0].videoWidth, height: vid[0].videoHeight}), vid[0].videoWidth, vid[0].videoHeight))
                .attr('src', item.source);

            e.stopImmediatePropagation();
        }

    }

}, 'lightbox');

UIkit.mixin({

    events: {

        showitem(e) {

            let item = this.getItem(), matches;

            if (!(matches = item.source.match(/\/\/.*?youtube\.[a-z]+\/watch\?v=([^&]+)&?(.*)/)) && !(item.source.match(/youtu\.be\/(.*)/))) {
                return;
            }

            let id = matches[1],
                img = new Image(),
                lowres = false,
                setIframe = (width, height) => this.setItem(item, `<iframe src="//www.youtube.com/embed/${id}" width="${width}" height="${height}" style="max-width:100%;box-sizing:border-box;"></iframe>`, width, height);

            img.onerror = () => setIframe(640, 320);
            img.onload = () => {
                //youtube default 404 thumb, fall back to lowres
                if (img.width === 120 && img.height === 90) {
                    if (!lowres) {
                        lowres = true;
                        img.src = `//img.youtube.com/vi/${id}/0.jpg`;
                    } else {
                        setIframe(640, 320);
                    }
                } else {
                    setIframe(img.width, img.height);
                }
            };

            img.src = `//img.youtube.com/vi/${id}/maxresdefault.jpg`;

            e.stopImmediatePropagation();
        }

    }

}, 'lightbox');

UIkit.mixin({

    events: {

        showitem(e) {

            let item = this.getItem(), matches;

            if (!(matches = item.source.match(/(\/\/.*?)vimeo\.[a-z]+\/([0-9]+).*?/))) {
                return;
            }

            let id = matches[2],
                setIframe = (width, height) => this.setItem(item, `<iframe src="//player.vimeo.com/video/${id}" width="${width}" height="${height}" style="max-width:100%;box-sizing:border-box;"></iframe>`, width, height);

            $.ajax({type: 'GET', url: `http://vimeo.com/api/oembed.json?url=${encodeURI(item.source)}`, jsonp: 'callback', dataType: 'jsonp'}).then((res) => setIframe(res.width, res.height));

            e.stopImmediatePropagation();
        }

    }

}, 'lightbox');
