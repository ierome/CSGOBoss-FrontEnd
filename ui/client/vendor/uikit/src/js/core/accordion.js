import { $, getIndex, toJQuery, Transition } from '../util/index';
import { Class, Toggable } from '../mixin/index';

export default function (UIkit) {

    UIkit.component('accordion', {

        mixins: [Class, Toggable],

        props: {
            targets: String,
            active: null,
            collapsible: Boolean,
            multiple: Boolean,
            toggle: String,
            content: String,
            transition: String
        },

        defaults: {
            targets: '> *',
            active: false,
            animation: true,
            collapsible: true,
            multiple: false,
            clsOpen: 'uk-open',
            toggle: '.uk-accordion-title',
            content: '.uk-accordion-content',
            transition: 'ease'
        },

        ready() {

            this.items = toJQuery(this.targets, this.$el);

            if (!this.items) {
                return;
            }

            this.$el.on('click', `${this.targets} ${this.toggle}`, e => {
                e.preventDefault();
                this.show(this.items.find(this.toggle).index(e.currentTarget));
            });

            this.items.each((i, el) => {
                el = $(el);
                this.toggleNow(el.find(this.content), el.hasClass(this.clsOpen));
            });

            var active = this.active !== false && toJQuery(this.items.eq(Number(this.active))) || !this.collapsible && toJQuery(this.items.eq(0));
            if (active && !active.hasClass(this.clsOpen)) {
                this.show(active, false);
            }
        },

        methods: {

            show(item, animate) {

                var index = getIndex(item, this.items),
                    active = this.items.filter(`.${this.clsOpen}`);

                item = this.items.eq(index);

                item.add(!this.multiple && active).each((i, el) => {

                    el = $(el);

                    var content = el.find(this.content), isItem = el.is(item), state = isItem && !el.hasClass(this.clsOpen);

                    if (!state && isItem && !this.collapsible && active.length < 2) {
                        return;
                    }

                    el.toggleClass(this.clsOpen, state);

                    if (!Transition.inProgress(content.parent())) {
                        content.wrap('<div>').parent().attr('hidden', state);
                    }

                    this.toggleNow(content, true);
                    this.toggleElement(content.parent(), state, animate).then(() => {
                        if (el.hasClass(this.clsOpen) === state) {

                            if (!state) {
                                this.toggleNow(content, false);
                            }

                            content.unwrap();
                        }
                    });

                })
            }

        }

    });

}
