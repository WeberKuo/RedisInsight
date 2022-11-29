import { flatten } from 'lodash'
import React from 'react'

import { CommandExecutionResult } from 'uiSrc/slices/interfaces'
import { cliParseCommandsGroupResult, wbSummaryCommand, Maybe } from 'uiSrc/utils'
import QueryCardCliDefaultResult from '../QueryCardCliDefaultResult'
import { CommonErrorResponse } from '../QueryCardCommonResult'

export interface Props {
  result?: Maybe<CommandExecutionResult[]>
  isFullScreen?: boolean
}

const QueryCardCliGroupResult = (props: Props) => {
  const { result = [], isFullScreen } = props

  return (
    <div data-testid="query-cli-default-result" className="query-card-output-response-success">
      <QueryCardCliDefaultResult
        isFullScreen={isFullScreen}
        items={flatten(result?.[0]?.response.map((item: any) => {
          const commonError = CommonErrorResponse(item.command, item.response)
          if (React.isValidElement(commonError)) {
            return ([wbSummaryCommand(item.command), commonError])
          }
          return flatten(cliParseCommandsGroupResult(item))
        }))}
      />
    </div>
  )
}

export default QueryCardCliGroupResult
