export default function (UIkit) {

    UIkit.component('spinner', UIkit.components.icon.extend({

        name: 'spinner',

        init() {
            this.height = this.width = this.$el.width();
        },

        ready() {

            this.svg.then(svg => {
                var circle = svg.find('circle'),
                    diameter = Math.floor(this.width / 2);

                svg[0].setAttribute('viewBox', `0 0 ${this.width} ${this.width}`);
                circle.attr({cx: diameter, cy: diameter, r: diameter - parseInt(circle.css('stroke-width'), 10)});
            });

        }

    }));

}
