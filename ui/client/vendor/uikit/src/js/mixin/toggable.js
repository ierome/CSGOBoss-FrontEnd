import { $, Animation, extend, isString, Transition } from '../util/index';

var initProps = {
        overflow: '',
        height: '',
        paddingTop: '',
        paddingBottom: '',
        marginTop: '',
        marginBottom: ''
    },
    hideProps = {
        overflow: 'hidden',
        height: 0,
        paddingTop: 0,
        paddingBottom: 0,
        marginTop: 0,
        marginBottom: 0
    };

export default {

    props: {
        cls: Boolean,
        animation: Boolean,
        duration: Number,
        origin: String,
        transition: String,
        queued: Boolean
    },

    defaults: {
        cls: false,
        animation: false,
        duration: 200,
        origin: false,
        transition: 'linear',
        queued: false
    },

    ready() {

        if (isString(this.animation)) {

            this.animation = this.animation.split(',');

            if (this.animation.length === 1) {
                this.animation[1] = this.animation[0];
            }

            this.animation = this.animation.map(animation => animation.trim());

        }

        this.queued = this.queued && !!this.animation;

    },

    methods: {

        toggleElement(targets, show, animate) {

            var toggles, body = document.body, scroll = body.scrollTop,
                all = targets => $.when.apply($, targets.toArray().map(el => this._toggleElement(el, show, animate))),
                delay = targets => {
                    var def = all(targets);
                    this.queued = true;
                    body.scrollTop = scroll;
                    return def;
                };

            targets = $(targets);

            if (!this.queued || targets.length < 2) {
                return all(targets);
            }

            if (this.queued !== true) {
                return delay(targets.not(this.queued));
            }

            this.queued = targets.not(toggles = targets.filter((_, el) => this.isToggled(el)));

            return all(toggles).then(() => this.queued !== true && delay(this.queued));
        },

        toggleNow(targets, show) {
            $(targets).each((_, el) => this._toggleElement(el, show, false));
        },

        isToggled(el) {
            el = $(el);
            return this.cls ? el.hasClass(this.cls.split(' ')[0]) : !el.attr('hidden');
        },

        updateAria(el) {
            if (this.cls === false) {
                el.attr('aria-hidden', !this.isToggled(el));
            }
        },

        _toggleElement(el, show, animate) {

            el = $(el);

            var deferred;

            if (Animation.inProgress(el)) {
                return Animation.cancel(el).then(() => this._toggleElement(el, show, animate));
            }

            show = typeof show === 'boolean' ? show : !this.isToggled(el);

            var event = $.Event(`before${show ? 'show' : 'hide'}`);
            el.trigger(event, [this]);

            if (event.result === false) {
                return $.Deferred().reject();
            }

            deferred = (this.animation === true && animate !== false
                ? this._toggleHeight
                : this.animation && animate !== false
                    ? this._toggleAnimation
                    : this._toggleImmediate
            )(el, show);

            el.trigger(show ? 'show' : 'hide', [this]);
            return deferred;
        },

        _toggle(el, toggled) {
            el = $(el);

            if (this.cls) {
                el.toggleClass(this.cls, ~this.cls.indexOf(' ') ? undefined : toggled);
            } else {
                el.attr('hidden', !toggled);
            }

            el.find('[autofocus]:visible').focus();

            this.updateAria(el);
            this.$update(null, el);
        },

        _toggleImmediate(el, show) {
            this._toggle(el, show);
            return $.Deferred().resolve();
        },

        _toggleHeight(el, show) {

            var inProgress = Transition.inProgress(el),
                inner = parseFloat(el.children().first().css('margin-top')) + parseFloat(el.children().last().css('margin-bottom')),
                height = el[0].offsetHeight ? el.height() + (inProgress ? 0 : inner) : 0,
                endHeight;

            Transition.cancel(el);

            if (!this.isToggled(el)) {
                this._toggle(el, true);
            }

            el.css('height', '');
            endHeight = el.height() + (inProgress ? 0 : inner);
            el.height(height);

            return show
                ? Transition.start(el, extend(initProps, {overflow: 'hidden', height: endHeight}), Math.round(this.duration * (1 - height / endHeight)), this.transition)
                : Transition.start(el, hideProps, Math.round(this.duration * (height / endHeight)), this.transition).then(() => {
                        this._toggle(el, false);
                        el.css(initProps);
                    });

        },

        _toggleAnimation(el, show) {

            if (show) {
                this._toggle(el, true);
                return Animation.in(el, this.animation[0], this.duration, this.origin);
            }

            return Animation.out(el, this.animation[1], this.duration, this.origin).then(() => this._toggle(el, false));
        }

    }

};
