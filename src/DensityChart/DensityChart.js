import React, { PureComponent } from "react";
import PropTypes from "prop-types";
import PlayButton from "./PlayButton";
import { event as d3Event, select as d3Select } from "d3-selection";
import {
    clearCanvas,
    drawRect
} from "../utils";
import { brushX } from "d3-brush";

export default class DensityChart extends PureComponent {
    static propTypes = {
        data: PropTypes.arrayOf(PropTypes.object).isRequired,
        spaceBetweenCharts: PropTypes.number.isRequired,
        width: PropTypes.number.isRequired,
        height: PropTypes.number.isRequired,
        padding: PropTypes.number.isRequired,
        brushDomainMax: PropTypes.oneOfType([
            PropTypes.instanceOf(Date),
            PropTypes.number
        ]).isRequired,
        brushDomainMin: PropTypes.oneOfType([
            PropTypes.instanceOf(Date),
            PropTypes.number
        ]).isRequired,
        frameStep: PropTypes.number.isRequired,
        frameDelay: PropTypes.number.isRequired,
        densityChartXScale: PropTypes.func.isRequired,
        onDomainChanged: PropTypes.func.isRequired,
        xAccessor: PropTypes.func.isRequired,
        brushDensityChartColor: PropTypes.string,
        brushDensityChartFadedColor: PropTypes.string,
        renderPlayButton: PropTypes.bool
    };

    static defaultProps = {
        renderPlayButton: true,
        brushDensityChartColor: "rgba(33, 150, 243, 0.2)",
        brushDensityChartFadedColor: "rgba(176, 190, 197, 0.2)"
    };

    constructor(props) {
        super(props);

        this.densityChartRef = React.createRef();
        this.densityBrushRef = React.createRef();
    }

    componentDidMount() {
        this.densityChartCanvasContext = this.densityChartRef.current.getContext("2d");

        const { width, height, densityChartXScale } = this.props;

        this.brush = brushX()
            .extent([
                [0, 0],
                [width, height]
            ])
            .on("brush end", this._onResizeBrush);

        this._updateBrush();

        this._moveBrush(densityChartXScale.range());

        this._renderDensityChart();
    }

    componentDidUpdate() {
        this._updateBrush();

        this._renderDensityChart();
    }

    componentWillUnmount() {
        clearInterval(this.playInterval);
        this.brush.on("brush end", null); // This is the way to unbind events in d3
    }

    /**
     * Handles brush events. It will update this.state.brushedDomain according to the
     * transformation on the event.
     *
     * @private
     */
    _onResizeBrush = () => {
        // This occurs always when the user change the brush domain manually
        if (d3Event.sourceEvent && d3Event.sourceEvent.type === "zoom") {
            return;
        }

        let brushSelection;

        if (Array.isArray(d3Event.selection)) {
            brushSelection = d3Event.selection;
        } else {
            // When we don't have any selection we should select everything
            brushSelection = this.props.densityChartXScale.range();
            this._moveBrush(brushSelection);
        }

        this.props.onDomainChanged(brushSelection);
    };

    _updateBrush() {
        d3Select(this.densityBrushRef.current)
            .call(this.brush);
    }

    /**
     * Moves brush on density strip plot to given domain
     * @private
     * @param {Array<Number>} domain
     */
    _moveBrush = (domain) => {
        d3Select(this.densityBrushRef.current)
            .call(this.brush.move, domain);
    };

    _renderPlayButton() {
        if (!this.props.renderPlayButton) {
            return null;
        }

        const { width, densityChartXScale, brushDomainMax, brushDomainMin, frameStep, frameDelay } = this.props;

        return (<PlayButton
            width={width}
            densityChartXScale={densityChartXScale}
            brushDomainMax={brushDomainMax}
            brushDomainMin={brushDomainMin}
            frameStep={frameStep}
            frameDelay={frameDelay}
            moveBrush={this._moveBrush}
        />);
    }

    /**
     * Draws density strip plot in canvas.
     * (Using canvas instead of svg for performance reasons as number of datapoints
     * can be very large)
     *
     * @private
     */
    _renderDensityChart() {
        const {
            width,
            height,
            densityChartXScale,
            brushDomainMax,
            brushDomainMin,
            xAccessor,
            data,
            brushDensityChartColor,
            brushDensityChartFadedColor
        } = this.props;

        clearCanvas(this.densityChartCanvasContext, width, height);

        for (let i = 0; i < data.length; ++i) {
            const x = xAccessor(data[i]);
            const isInsideOfBrushDomain = x >= brushDomainMin && x < brushDomainMax;

            drawRect(
                this.densityChartCanvasContext, // canvas context
                densityChartXScale(x), // x
                0, // y
                2, // width
                height, // height
                {
                    fillStyle: isInsideOfBrushDomain ? brushDensityChartColor : brushDensityChartFadedColor
                }
            );
        }
    }

    render() {
        let leftPadding = 0;

        const { width, height, padding, spaceBetweenCharts } = this.props;

        if (!this.props.renderPlayButton) {
            leftPadding = padding * 2;
        }

        const densityChartCanvasStyle = { top: spaceBetweenCharts, left: leftPadding };

        return (<div className="fdz-css-graph-histogram-density__wrapper" >
            {this._renderPlayButton()}
            <div className="fdz-css-graph-histogram-density">
                <canvas
                    ref={this.densityChartRef}
                    className="fdz-css-graph-histogram-density__canvas"
                    width={width}
                    height={height}
                    style={densityChartCanvasStyle}
                />
                <svg
                    ref={this.densityBrushRef}
                    className="fdz-css-graph-histogram-brush"
                    width={width}
                    height={height}
                    transform={`translate(${leftPadding}, -${height - 4})`}
                />
            </div>
        </div>);
    }
}
