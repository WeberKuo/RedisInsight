import React, { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import {
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexItem,
  EuiFocusTrap,
  EuiForm,
  EuiLoadingSpinner,
  EuiOutsideClickDetector,
  EuiText,
  EuiTextArea,
  EuiWindowEvent
} from '@elastic/eui'
import cx from 'classnames'
import { bufferToString, createDeleteFieldHeader, createDeleteFieldMessage } from 'uiSrc/utils'

import PopoverDelete from 'uiSrc/pages/browser/components/popover-delete/PopoverDelete'
import FieldMessage from 'uiSrc/components/field-message/FieldMessage'
import { RejsonDynamicTypes } from 'uiSrc/pages/browser/modules/key-details/components/rejson-details/rejson-dynamic-types'
import {
  IJSONObject,
  JSONScalarValue,
  REJSONResponse,
  JSONObjectProps
} from 'uiSrc/pages/browser/modules/key-details/components/rejson-details/interfaces'
import { generatePath, validateRejsonValue } from 'uiSrc/pages/browser/modules/key-details/components/rejson-details/utils'
import { JSONErrors } from 'uiSrc/pages/browser/modules/key-details/components/rejson-details/constants'

import styles from '../styles.module.scss'

const RejsonObject = (props: JSONObjectProps) => {
  const {
    parentPath,
    keyName,
    shouldRejsonDataBeDownloaded,
    leftPadding,
    selectedKey,
    cardinality = 0,
    handleSubmitRemoveKey,
    onClickRemoveKey,
    handleSubmitJsonUpdateValue,
    handleSubmitUpdateValue,
    onJsonKeyExpandAndCollapse,
    handleFetchVisualisationResults,
    handleAppendRejsonArrayItemAction,
    handleSetRejsonDataAction,
    path: currentFullPath,
    value: currentValue
  } = props

  const [path] = useState<string>(currentFullPath || generatePath(parentPath, keyName))
  const [value, setValue] = useState<any>([])
  const [openIndex, setOpenIndex] = useState<boolean>(false)
  const [downloaded, setDownloaded] = useState<boolean>(!shouldRejsonDataBeDownloaded)
  const [editEntireObject, setEditEntireObject] = useState<boolean>(false)
  const [valueOfEntireObject, setValueOfEntireObject] = useState<any>('')
  const [addNewKeyValuePair, setAddNewKeyValuePair] = useState<boolean>(false)
  const [newKey, setNewKey] = useState<string>('')
  const [newValue, setNewValue] = useState<string>('')
  const [deleting, setDeleting] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setError(null)
  }, [newKey, newValue, valueOfEntireObject])

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    onClickAddNewKVPair()
  }

  const handleResetAddNewKeyValuePair = () => {
    setError(null)
    setAddNewKeyValuePair(false)
    setNewKey('')
    setNewValue('')
  }

  const handleUpdateValueFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setEditEntireObject(false)
    onClickSubmitEntireObject()
  }

  const handleOnEsc = (e: KeyboardEvent, type: string) => {
    if (e.code.toLowerCase() === 'escape' || e.keyCode === 27) {
      e.stopPropagation()
      setError(null)

      if (type === 'add') handleResetAddNewKeyValuePair()
      if (type === 'edit') setEditEntireObject(false)
    }
  }

  const onClickEditEntireObject = () => {
    setEditEntireObject(!editEntireObject)

    if (!editEntireObject) {
      handleFetchVisualisationResults(path, true).then((data: REJSONResponse) => {
        setValueOfEntireObject(typeof data.data === 'object' ? JSON.stringify(data.data, undefined, 4) : data.data)
      })
    }
  }

  const onClickSubmitEntireObject = () => {
    setEditEntireObject(false)
    const error: string | null = validateRejsonValue(valueOfEntireObject)

    if (error) {
      setError(error)
      setEditEntireObject(true)
      return
    }

    const body: IJSONObject = {
      path,
      value: valueOfEntireObject as JSONScalarValue,
      operation: 'update'
    }

    handleSubmitJsonUpdateValue(body)
    handleSetRejsonDataAction(selectedKey, path, valueOfEntireObject as string)
  }

  const onClickSetKVPair = () => {
    setAddNewKeyValuePair(!addNewKeyValuePair)
    setNewKey('')
    setNewValue('')
  }

  const onClickAddNewKVPair = () => {
    setAddNewKeyValuePair(false)

    const error: string | null = validateKeyValue()
    if (error) {
      setAddNewKeyValuePair(true)
      setError(error)
      return
    }

    const body: IJSONObject = {
      previous_path: path,
      new_key: newKey,
      path: `${path}[${newKey}]`,
      operation: 'update',
      value: newValue
    }

    handleSubmitJsonUpdateValue(body)
    const unescapedKey = JSON.parse(newKey as string)
    const updatedPath = unescapedKey.includes('"') ? `${path}['${unescapedKey}']` : `${path}["${unescapedKey}"]`
    handleSetRejsonDataAction(selectedKey, updatedPath, newValue as string)
  }

  const onClickFunc = (path: string) => {
    // Report Expand and Collapse event
    onJsonKeyExpandAndCollapse(!openIndex, path)

    if (!openIndex) {
      if (!shouldRejsonDataBeDownloaded) {
        setValue(currentValue)
        setOpenIndex(true)
        return
      }

      const spinnerDelay = setTimeout(() => setLoading(true), 300)
      handleFetchVisualisationResults(path)
        .then((data) => {
          setValue(data.data)
          setOpenIndex(true)
          setDownloaded(data.downloaded)
          setLoading(false)
        })
        .catch(() => {
          clearTimeout(spinnerDelay)
        })

      return
    }

    setValue([])
    setOpenIndex(!openIndex)
  }

  const validateKeyValue = (): string => {
    if (newKey === undefined || newKey === '') {
      return JSONErrors.keyCorrectSyntax
    }
    if (!newKey.startsWith('"') || !newKey.endsWith('"')) {
      return JSONErrors.keyCorrectSyntax
    }
    try {
      const unescapedKey = JSON.parse(newKey as string)
      if (unescapedKey.includes('"') && unescapedKey.includes("'")) {
        return JSONErrors.keyCorrectSyntax
      }
    } catch (e) {
      return JSONErrors.keyCorrectSyntax
    }
    try {
      JSON.parse(newValue as string)
    } catch (e) {
      return JSONErrors.valueJSONFormat
    }
    return ''
  }

  return (
    <>
      <div className={styles.row} key={keyName + parentPath}>
        <div className={styles.rowContainer}>
          <div className={styles.quotedKeyName} style={{ paddingLeft: `${leftPadding}em` }}>
            <span
              className={cx(styles.quoted, styles.keyName)}
              onClick={() => onClickFunc(path)}
              role="presentation"
            >
              {keyName}
            </span>
            <div style={{ paddingLeft: '0.2em', display: 'inline-block' }}>:</div>
            {!openIndex && !editEntireObject ? (
              <div
                className={styles.defaultFontExpandArray}
                onClick={() => onClickFunc(path)}
                data-testid="expand-object"
                role="presentation"
              >
                &#123;
                {cardinality ? '...' : ''}
                &#125;
              </div>
            ) : null}
            {openIndex && !editEntireObject ? <span className={styles.defaultFontOpenIndex}>&#123;</span> : null}
          </div>
          <>
            {!editEntireObject && !loading && (
              <div className={styles.actionButtons}>
                <EuiButtonIcon
                  iconType="documentEdit"
                  className={styles.jsonButtonStyle}
                  onClick={onClickEditEntireObject}
                  aria-label="Edit field"
                  color="primary"
                  data-testid="edit-object-btn"
                />
                <PopoverDelete
                  header={createDeleteFieldHeader(keyName.toString())}
                  text={createDeleteFieldMessage(bufferToString(selectedKey))}
                  item={keyName.toString()}
                  suffix="object"
                  deleting={deleting}
                  closePopover={() => setDeleting('')}
                  updateLoading={false}
                  showPopover={(item) => { setDeleting(`${item}object`) }}
                  handleDeleteItem={() => handleSubmitRemoveKey(path, keyName.toString())}
                />
              </div>
            )}
          </>
          <>
            {loading && (
              <div className={styles.actionButtons} style={{ justifyContent: 'flex-end' }}>
                <div className={styles.spinner}>
                  <EuiLoadingSpinner size="m" />
                </div>
              </div>
            )}
          </>
        </div>
      </div>
      <>
        {editEntireObject && (
          <div className={styles.row}>
            <div style={{ width: '100%', padding: '10px 0' }}>
              <EuiOutsideClickDetector onOutsideClick={() => {
                setError(null)
                setEditEntireObject(false)
              }}
              >
                <div style={{ marginBottom: '34px' }}>
                  <EuiWindowEvent event="keydown" handler={(e) => handleOnEsc(e, 'edit')} />
                  <EuiFocusTrap>
                    <EuiForm
                      component="form"
                      className="relative"
                      onSubmit={(e) => handleUpdateValueFormSubmit(e)}
                      noValidate
                    >
                      <EuiFlexItem grow component="span">
                        <EuiTextArea
                          isInvalid={!!error}
                          style={{ height: '150px', width: '100%', maxWidth: 'none' }}
                          value={valueOfEntireObject ? valueOfEntireObject.toString() : ''}
                          placeholder="Enter JSON value"
                          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setValueOfEntireObject(event.target.value)}
                          data-testid="json-value"
                        />
                      </EuiFlexItem>
                      <div className={cx(styles.controls, styles.controlsBottom)}>
                        <EuiButtonIcon
                          iconSize="m"
                          iconType="cross"
                          color="primary"
                          aria-label="Cancel add"
                          className={styles.declineBtn}
                          onClick={() => {
                            setError(null)
                            setEditEntireObject(false)
                          }}
                        />
                        <EuiButtonIcon
                          iconSize="m"
                          iconType="check"
                          color="primary"
                          type="submit"
                          aria-label="Apply"
                          className={styles.applyBtn}
                          data-testid="apply-edit-btn"
                        />
                      </div>
                    </EuiForm>
                    {error && (
                      <div className={cx(styles.errorMessage, styles.errorMessageForTextArea)}>
                        <FieldMessage
                          scrollViewOnAppear
                          icon="alert"
                          testID="edit-json-error"
                        >
                          {error}
                        </FieldMessage>
                      </div>
                    )}
                  </EuiFocusTrap>
                </div>

              </EuiOutsideClickDetector>
            </div>
          </div>
        )}
      </>
      {!editEntireObject ? (
        <>
          {value
            ? (
              <RejsonDynamicTypes
                data={value}
                selectedKey={selectedKey}
                onClickRemoveKey={onClickRemoveKey}
                handleSubmitJsonUpdateValue={handleSubmitJsonUpdateValue}
                shouldRejsonDataBeDownloaded={!downloaded}
                onJsonKeyExpandAndCollapse={onJsonKeyExpandAndCollapse}
                handleSubmitUpdateValue={handleSubmitUpdateValue}
                parentPath={path}
                onClickFunc={onClickFunc}
                handleFetchVisualisationResults={handleFetchVisualisationResults}
                handleAppendRejsonArrayItemAction={handleAppendRejsonArrayItemAction}
                handleSetRejsonDataAction={handleSetRejsonDataAction}
              />
            )
            : '{}'}
        </>
      ) : null}
      <>
        {addNewKeyValuePair ? (
          <div className={styles.row} style={{ paddingLeft: `${leftPadding}em` }}>
            <EuiOutsideClickDetector onOutsideClick={handleResetAddNewKeyValuePair}>
              <div>
                <EuiWindowEvent event="keydown" handler={(e) => handleOnEsc(e, 'add')} />
                <EuiFocusTrap>
                  <EuiForm
                    component="form"
                    className="relative"
                    onSubmit={(e) => handleFormSubmit(e)}
                    style={{ display: 'flex' }}
                    noValidate
                  >
                    <EuiFlexItem grow component="span">
                      <EuiFieldText
                        name="newRootKey"
                        isInvalid={!!error}
                        value={newKey}
                        placeholder="Enter JSON key"
                        onChange={(event: ChangeEvent) => setNewKey(event.target.value)}
                        data-testid="json-key"
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow component="span">
                      <EuiFieldText
                        name="newValue"
                        isInvalid={!!error}
                        value={newValue as string}
                        placeholder="Enter JSON value"
                        onChange={(event: ChangeEvent) => setNewValue(event.target.value)}
                        data-testid="json-value"
                      />
                    </EuiFlexItem>
                    <div className={cx(styles.controls)}>
                      <EuiButtonIcon
                        iconSize="m"
                        iconType="cross"
                        color="primary"
                        aria-label="Cancel editing"
                        className={styles.declineBtn}
                        onClick={handleResetAddNewKeyValuePair}
                      />
                      <EuiButtonIcon
                        iconSize="m"
                        iconType="check"
                        color="primary"
                        type="submit"
                        aria-label="Apply"
                        className={styles.applyBtn}
                        data-testid="apply-btn"
                      />
                    </div>
                  </EuiForm>
                  {error && (
                    <div className={cx(styles.errorMessage)}>
                      <FieldMessage
                        scrollViewOnAppear
                        icon="alert"
                        testID="edit-json-error"
                      >
                        {error}
                      </FieldMessage>
                    </div>
                  )}
                </EuiFocusTrap>
              </div>
            </EuiOutsideClickDetector>
          </div>
        ) : null}
      </>
      <>
        {openIndex && !editEntireObject ? (
          <div
            className={styles.row}
            style={{ paddingLeft: `${leftPadding}em` }}
          >
            <EuiText>
              <span className={styles.defaultFont}>&#125;</span>
              <EuiButtonIcon
                iconType="plus"
                className={styles.buttonStyle}
                onClick={onClickSetKVPair}
                aria-label="Add field"
                data-testid="add-field-btn"
              />
            </EuiText>
          </div>
        ) : null}
      </>
    </>
  )
}

export default RejsonObject
