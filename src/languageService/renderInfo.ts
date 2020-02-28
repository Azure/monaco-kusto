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
export declare type Kind = 'default' | 'unstacked' | 'stacked' | 'stacked100';

export interface RenderOptions {
    visualization?: VisualizationType;
    title?: string;
    xcolumn?: string;
    series?: string[];
    ycolumns?: string[];
    xtitle?: string;
    ytitle?: string;
    xaxis?: Scale;
    yaxis?: Scale;
    legend?: LegendVisibility;
    ySplit?: YSplit;
    accumulate?: boolean;
    kind?: Kind;
    anomalycolumns?: string[];
    ymin?: number;
    ymax?: number;
}

export interface RenderInfo {
    options: RenderOptions;
    location: { startOffset: number; endOffset: number };
}

export type RenderOptionKeys = keyof RenderOptions;
