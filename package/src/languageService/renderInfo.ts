export declare type VisualizationType =
    | 'anomalychart'
    | 'areachart'
    | 'barchart'
    | 'columnchart'
    | 'ladderchart'
    | 'linechart'
    | 'piechart'
    | 'pivotchart'
    | 'scatterchart'
    | 'stackedareachart'
    | 'timechart'
    | 'table'
    | 'timeline'
    | 'timepivot'
    | 'card';

export declare type Scale = 'linear' | 'log';
export declare type LegendVisibility = 'visible' | 'hidden';
export declare type YSplit = 'none' | 'axes' | 'panels';
export declare type Kind = 'default' | 'unstacked' | 'stacked' | 'stacked100' | 'map';

export interface RenderOptions {
    visualization?: null | VisualizationType;
    title?: null | string;
    xcolumn?: null | string;
    series?: null | string[];
    ycolumns?: null | string[];
    xtitle?: null | string;
    ytitle?: null | string;
    xaxis?: null | Scale;
    yaxis?: null | Scale;
    legend?: null | LegendVisibility;
    ySplit?: null | YSplit;
    accumulate?: null | boolean;
    kind?: null | Kind;
    anomalycolumns?: null | string[];
    ymin?: null | number;
    ymax?: null | number;
}

export interface RenderInfo {
    options: RenderOptions;
    location: { startOffset: number; endOffset: number };
}

export type RenderOptionKeys = keyof RenderOptions;
