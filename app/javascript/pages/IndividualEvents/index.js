import React from 'react'
import { connect } from 'react-redux'
import { graphql, compose } from 'react-apollo'
import { Field, reduxForm } from 'redux-form'
import R from 'ramda'
import moment from 'moment'

import DatePicker from 'material-ui/DatePicker'
import Dialog from 'material-ui/Dialog'
import ActionDone from 'material-ui/svg-icons/action/done'
import ActionInfoOutline from 'material-ui/svg-icons/action/info-outline'
import AutoComplete from 'material-ui/AutoComplete'
import AVNotInterested from 'material-ui/svg-icons/av/not-interested'

import { togglePopover } from 'actions'

import Callout from 'components/Callout'
import Layout from 'components/Layout'
import Loading from 'components/LoadingIcon'

import IndividualEventsQuery from './query.gql'
import CreateEditIndividualEventMutation from 'mutations/CreateEditIndividualEventMutation.gql'
import DeleteIndividualEventMutation from 'mutations/DeleteIndividualEventMutation.gql'
import s from './main.css'

const styles = {
  dialogBody: {
    maxHeight: 500,
  },
  dialogNoBorder: {
    border: 'none',
  },
  muiTextField: {
    height: 20,
    width: 'calc(100% - 8px)',
    border: '1px solid #ddd',
    borderRadius: 4,
    padding: 5,
  },
}

const eventStatusIcon = event => {
  switch (event.status) {
    case 'REJECTED':
      return <AVNotInterested color="#A93A38" />
    case 'PENDING':
      return <ActionInfoOutline color="#EFC93D" />
    case 'APPROVED':
      return <ActionDone color="16BA52" />
    default:
      return <ActionInfoOutline color="#EFC93D" />
  }
}

const DateField = ({ input: { value, onChange }, label, type, meta }) => (
  <div>
    <DatePicker
      id="date"
      hintText=""
      className={s.muiTextField}
      textFieldStyle={styles.muiTextField}
      onChange={(_, date) => onChange(date)}
      defaultDate={value ? new Date(value || meta.initial) : undefined}
      autoOk
    />
  </div>
)

const AutoCompleteField = ({ input: { value, onChange }, label, type, meta, dataSource }) => (
  <div>
    <AutoComplete
      id="organization"
      searchText={value && R.find(item => item.id === value)(dataSource).name}
      dataSource={dataSource}
      dataSourceConfig={{ text: 'name', value: 'id' }}
      filter={AutoComplete.fuzzyFilter}
      onNewRequest={(chosen, _i) => onChange(chosen.id)}
      className={s.muiTextField}
      textFieldStyle={styles.muiTextField}
      fullWidth
    />
  </div>
)

const validate = values => {
  const errors = {}
  if (!values.description) {
    errors.description = 'is required'
  }
  if (!values.office) {
    errors.office = {}
    errors.office.id = 'is required'
  }
  if (!values.date) {
    errors.date = 'is required'
  }
  if (!values.duration) {
    errors.duration = 'is required'
  } else if (values.duration > 24 * 60) {
    errors.duration = 'must be less than or equal to 24 hours'
  }
  if (!values.eventType) {
    errors.eventType = {}
    errors.eventType.id = 'is required'
  }
  if (!values.organization) {
    errors.organization = {}
    errors.organization.id = 'is required'
  }
  return errors
}

const renderFieldHelper = ({ input, type, label, className, selectOptions }) => {
  switch (type) {
    case 'input':
    case 'number':
      return <input {...input} type={type} className={className} />
    case 'textarea':
      return <textarea {...input} className={className} />
    case 'select':
      return (
        <select {...input} className={className}>
          {selectOptions}
        </select>
      )
    default:
      return <Callout type="error" />
  }
}

const renderField = props => {
  const { input, label, type, Custom, meta: { touched, error, warning }, className, required } = props
  const fieldInput = renderFieldHelper({ input, type, label, className, selectOptions: props.children })
  return (
    <div>
      <label>
        {label} <span className={s.errorMsg}>{touched && error ? error : '*'}</span>
      </label>
      <div>{Custom ? <Custom {...props} /> : fieldInput}</div>
    </div>
  )
}

const CreateEditDialog = ({ offices, eventTypes, organizations, onCancel, popover, onSubmit }) => {
  const event = popover.data
  const isNewEvent = R.isNil(event)
  return (
    <Dialog
      title={isNewEvent ? 'Create Event' : 'Edit Event'}
      open
      titleStyle={R.merge(styles.dialogNoBorder, { paddingTop: 10 })}
      actionsContainerStyle={R.merge(styles.dialogNoBorder, { paddingBottom: 20 })}
      modal
      autoScrollBodyContent
    >
      <form className={s.form} onSubmit={onSubmit}>
        <Field name="id" label="id" component="input" value={event ? event.id : -1} type="hidden" />
        <Field
          name="description"
          label="Description"
          component={renderField}
          type="textarea"
          label="Description"
          className={s.input}
        />
        <div className={s.formSpace} />
        <div>
          <Field
            name="office.id"
            label="Office"
            component={renderField}
            type="select"
            label="Office"
            className={s.input}
          >
            <option />
            {offices.map(office => (
              <option key={`office-${office.id}`} value={office.id}>
                {office.name}
              </option>
            ))}
          </Field>
        </div>
        <div className={s.formSpace} />
        <div className={s.row}>
          <div className={s.column}>
            <Field name="date" Custom={DateField} component={renderField} label="Date" />
          </div>
          <div className={s.column}>
            <Field
              name="duration"
              label="Duration (minutes)"
              type="number"
              normalize={value => (value >= 0 ? value : 0)}
              component={renderField}
              className={s.input}
            />
          </div>
        </div>
        <div className={s.formSpace} />
        <div className={s.row}>
          <div className={s.column}>
            <Field name="eventType.id" label="Type" type="select" component={renderField} className={s.input}>
              <option />
              {eventTypes.map(type => (
                <option key={`type-${type.id}`} value={type.id}>
                  {type.title}
                </option>
              ))}
            </Field>
          </div>
          <div className={s.column}>
            <Field
              name="organization.id"
              component={renderField}
              Custom={AutoCompleteField}
              label="Organization"
              dataSource={organizations}
            />
          </div>
        </div>
        <div className={`${s.row} ${s.dialogBottomBar}`}>
          <div className={s.errorMsg}>
            Required <span className={s.errorMsg}>*</span>
          </div>
          <div className={`${s.row} ${s.dialogActions}`}>
            <button className={`${s.btn} ${s.cancelBtn}`} onClick={onCancel} type="button">
              Cancel
            </button>
            <button className={`${s.btn} ${s.confirmBtn}`} type="submit">
              {isNewEvent ? 'Create' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  )
}

const DestroyDialog = ({ onDelete, onCancel, popover }) => (
  <Dialog
    title="Delete Event"
    modal={false}
    actions={[
      <button className={`${s.btn} ${s.cancelBtn}`} onClick={onCancel}>
        Cancel
      </button>,
      <button className={`${s.btn} ${s.deleteBtn}`} onClick={onDelete}>
        Delete
      </button>,
    ]}
    open
    onRequestClose={() => togglePopover('destroyIndividualEvent', popover.data)}
    actionsContainerStyle={{ paddingBottom: 20 }}
  >
    <p>Are you sure you want to delete this event?</p>
    <p>{popover.data.description}</p>
  </Dialog>
)

const IndividualEvents = props => {
  const {
    data,
    locationBeforeTransitions,
    popover,
    togglePopover,
    handleSubmit,
    createEditIndividualEvent,
    deleteIndividualEvent,
  } = props

  const { currentUser, offices, eventTypes, organizations } = data

  if (data.loading) {
    return <Loading />
  } else if (data.error) {
    return <div>Sorry, we are having trouble loading your events.</div>
  } else {
    return (
      <Layout currentPath={locationBeforeTransitions.pathname}>
        <div className={s.actionBar}>
          <button className={s.createAction} onClick={() => togglePopover('editIndividualEvent')}>
            Add Event
          </button>
        </div>
        <table className={s.table}>
          <thead>
            <tr>
              <th>Description</th>
              <th>Organization</th>
              <th>Date</th>
              <th>Duration (minutes)</th>
              <th>Type</th>
              <th>Approval</th>
              <th className={s.actionColumn}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentUser.individualEvents.map(event => (
              <tr key={`event-${event.id}`}>
                <td>{event.description}</td>
                <td>{event.organization.name}</td>
                <td>{moment(event.date).format('MMMM D, YYYY')}</td>
                <td>{event.duration}</td>
                <td>{event.eventType.title}</td>
                <td>{eventStatusIcon(event)}</td>
                <td className={s.actionColumn}>
                  <button
                    className={`${s.btn} ${s.confirmBtn} ${s.leftAligned}`}
                    onClick={() => togglePopover('editIndividualEvent', event)}
                  >
                    Edit
                  </button>
                  <button
                    className={`${s.btn} ${s.deleteBtn}`}
                    onClick={() => togglePopover('destroyIndividualEvent', event)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {popover && popover.type === 'editIndividualEvent' ? (
          <CreateEditDialog
            offices={offices}
            eventTypes={eventTypes}
            organizations={organizations}
            popover={popover}
            onSubmit={handleSubmit(createEditIndividualEvent)}
            onCancel={() => togglePopover('editIndividualEvent')}
          />
        ) : null}
        {popover && popover.type === 'destroyIndividualEvent' ? (
          <DestroyDialog
            popover={popover}
            onDelete={() => deleteIndividualEvent(popover.data.id) && togglePopover('destroyIndividualEvent')}
            onCancel={() => togglePopover('destroyIndividualEvent')}
          />
        ) : null}
      </Layout>
    )
  }
}

const mapStateToProps = (state, _ownProps) => {
  const { popover } = state.model
  const { locationBeforeTransitions } = state.routing
  const props = {
    popover,
    locationBeforeTransitions,
  }

  return R.isNil(popover) ? props : R.merge({ initialValues: popover.data }, props)
}

const formDataToIndividualEventInput = data => {
  const date = moment(data.date).unix()
  return {
    id: data.id,
    description: data.description,
    officeId: data.office.id,
    date,
    duration: parseInt(data.duration, 10),
    eventTypeId: data.eventType.id,
    organizationId: data.organization.id,
  }
}

const individualEventInputToOptimisticResponse = (data, input) => {
  return {
    __typename: 'IndividualEvent',
    id: input.id || -1,
    description: input.description,
    office: R.find(office => office.id === input.officeId, data.offices),
    date: moment(input.date),
    duration: input.duration,
    eventType: R.find(et => et.id === input.eventTypeId, data.eventTypes),
    organization: R.find(org => org.id === input.organizationId, data.organizations),
    status: 'PENDING',
  }
}

const buildOptimisticResponse = (newEvent, currentUser) => {
  const { id: currentUserId, individualEvents: existingEvents } = currentUser
  const arrIdx = R.find(R.propEq('id', newEvent.id), existingEvents)
  const individualEvents = R.isNil(arrIdx)
    ? R.append(newEvent, existingEvents)
    : R.update(arrIdx, newEvent, existingEvents)

  return {
    __typename: 'Mutation',
    createEditIndividualEvent: {
      __typename: 'User',
      id: currentUserId,
      individualEvents,
    },
  }
}

const withData = compose(
  graphql(IndividualEventsQuery, {
    options: {
      fetchPolicy: 'cache-and-network',
    },
  }),
  graphql(CreateEditIndividualEventMutation, {
    props: ({ ownProps, mutate }) => ({
      createEditIndividualEvent: data => {
        const currentUser = ownProps.data.currentUser
        const individualEventInput = formDataToIndividualEventInput(data)
        const newEvent = individualEventInputToOptimisticResponse(ownProps.data, individualEventInput)

        return mutate({
          variables: { input: individualEventInput },
          optimisticResponse: buildOptimisticResponse(newEvent, currentUser),
        })
      },
    }),
  }),
  graphql(DeleteIndividualEventMutation, {
    props: ({ ownProps, mutate }) => ({
      deleteIndividualEvent: id => {
        const currentUser = ownProps.data.currentUser

        return mutate({
          variables: { input: { id } },
          optimisticResponse: {
            __typename: 'Mutation',
            deleteIndividualEvent: {
              __typename: 'User',
              id: currentUser.id,
              individualEvents: R.reject(ie => ie.id === currentUser.id, currentUser.individualEvents),
            },
          },
        })
      },
    }),
  })
)

const withReduxForm = reduxForm({
  form: 'individualEvent',
  enableReinitialize: true,
  onSubmitSuccess: (result, dispatch, props) => {
    props.togglePopover('editIndividualEvent')
  },
  validate,
})

const withActions = connect(mapStateToProps, {
  togglePopover,
})

export default withActions(withData(withReduxForm(IndividualEvents)))
