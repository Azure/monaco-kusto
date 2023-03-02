/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

declare interface String {
    endsWith(searchString: string, length?: number): boolean;
}

/**
 * For Some reason Bridge.Net doesn't bother to generate declarations for this one.
 */
declare module System.Text.RegularExpressions {
    export interface Regex {}

    export interface Match {}
    export interface MatchCollection {}
}
